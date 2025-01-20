require("dotenv").config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const APIKey = process.env.API_KEY;

var Players = [];
const maxPlayers = 4;

var OnGoing = false;

var PromptForGenText = '';
var PlayerSubmitted = 0;

const { HfInference } = require("@huggingface/inference");
const client = new HfInference(APIKey);

async function getBattleResult(userMessage) {
  try {
      const chatCompletion = await client.chatCompletion({
          model: "Qwen/Qwen2.5-Coder-32B-Instruct",
          messages: [
              {
                  role: "user",
                  content: userMessage
              }
          ],
          max_tokens: 1000
      });

      return chatCompletion.choices[0].message.content;
  } catch (error) {
      console.error("Error fetching chat response:", error);
      return null;
  }
}


async function GenerateImage(data) {
  const response = await fetch(
    "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-3.5-large",
    {
      headers: {
        Authorization: "Bearer " + APIKey,
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }

  //for converting Blob to base64String
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const base64String = Buffer.from(arrayBuffer).toString('base64');
  
  return base64String;
}




io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join', (username) => {
      if(Players.length < maxPlayers && !OnGoing){
        socket.username = username;

        Players.push({id: socket.id, name: socket.username, status: "Not Ready"});

        socket.emit('user-joined', {id: socket.id, PlayerList: Players, msg: "You have joined.", status: "success" });
        socket.broadcast.emit('other-user-joined', { id: socket.id, PlayerList: Players, msg: `${username} has joined`, status: "success" });

      }else{
        socket.emit('user-joined', { status: "failed" });
      }

      if (Players.every(item => item.status == 'Ready') && Players.length > 1) {
        socket.emit('user-StartButton');
      }else{
        io.emit('user-HideStartButton');
      }
      
      console.log(Players);
    });

    socket.on('ready', () =>{

      const ReadyPlayer = Players.find(ReadyPlayer => ReadyPlayer.id == socket.id);
      if (ReadyPlayer) {
        ReadyPlayer.status = "Ready";
        console.log(`Changed status of player with id ${socket.id} to Ready.`);
        io.emit('user-ready', { id: socket.id, PlayerList: Players, msg: `${socket.username} is ready` });
        socket.emit('user-ButtonReady');

        if (Players.every(item => item.status == 'Ready') && Players.length > 1) {
          socket.emit('user-StartButton');
        }else{
          io.emit('user-HideStartButton');
        }

      } else {
        console.log(`player with id ${socket.id} not found.`);
      }

    });

    socket.on('unready', () =>{

      const ReadyPlayer = Players.find(ReadyPlayer => ReadyPlayer.id == socket.id);
      if (ReadyPlayer) {
        ReadyPlayer.status = "Not Ready";
        console.log(`Changed status of player with id ${socket.id} to Not Ready.`);
        io.emit('user-unready', { id: socket.id, PlayerList: Players, msg: `${socket.username} is not ready` });
        socket.emit('user-ButtonUnready');

        if (Players.every(item => item.status == 'Ready') && Players.length > 1) {
          socket.emit('user-StartButton');
        }else{
          io.emit('user-HideStartButton');
        }

      } else {
        console.log(`player with id ${socket.id} not found.`);
      }

    });

    socket.on('send-ImgPrompt', (prompt) => {



      GenerateImage({"inputs": prompt}).then((response) => {
      
        const imageUrl = `data:image/png;base64,${response}`;

        console.log(`${socket.username}: ${prompt}`);
        io.emit('broadcast-ImgBlob', { id: socket.username, msg: imageUrl });
      
      }).catch((error) => {
          console.error('Error fetching image:', error);
      });


      
    });

    socket.on('send-message', (msg) => {
        console.log(`${socket.username}: ${msg}`);
        io.emit('broadcast-message', { id: socket.username, msg });
    });
  
    socket.on('disconnect', () => {
      console.log('A user disconnected:', socket.username);

      if(socket.username!=null){

        const index = Players.findIndex(item => item.id == socket.id);
      
        if (index !== -1) {
          Players.splice(index, 1);
          console.log(Players);
          socket.broadcast.emit('user-disconnected', { name: socket.username, msg: socket.username + " has Disconnected.", status: "success" });
        }

      }

      if(Players.length == 0){
        OnGoing = false;
        PlayerSubmitted = 0;
      }

    });

    socket.on('StartGame', () =>{
        console.log('Game Started');
        io.emit('GoToGame');
        PromptForGenText = '';
    });

    socket.on('ChangeOngoingStatus', ()=>{
        OnGoing = true;
    });


    socket.on('Submit', (prompt) =>{
      PlayerSubmitted++;
      socket.emit('Hide-SubmitButton', prompt, PlayerSubmitted, Players);
    });

    socket.on('UpdateAllSubmittedPlayer', ({msg}) =>{
      console.log(msg);
      io.emit('UpdateSubmitted', msg);
    });

    socket.on('PushThePrompt', (prompt) => {
      console.log(socket.username +': '+ prompt);
      PromptForGenText += "Player name: "+ socket.username +"\nPrompt: My name is \"" + socket.username + "\". " + prompt + ".\n\n\n";

      console.log(PromptForGenText);

      if(PlayerSubmitted == Players.length){
        
        io.emit('GoToLoading');
        
        PlayerSubmitted = 0;
        

        console.log(PromptForGenText);

        getBattleResult(PromptForGenText + "\n\n\n*IMPORTANT*\n Write 200-word paragraphs of battle story featuring ONLY the "+ Players.length +" players above in a combat, focus on their unique abilities and characteristics as they fight each other. Determine the ending of the battle, make a SINGLE winner.")
        .then(response1 => {
            console.log(response1);



              getBattleResult("\"" + response1 + "\"\n\n  Determine visuals ques of every character and their actions. Summarize it to 2 sentences. MAKE IT TWO SENTENCES!")
            .then(SummarizeResponse => {

              console.log("\n\nSUMMARIZED: "+SummarizeResponse+"\n\n");

              GenerateImage({"inputs": "ANIME STYLE; "+SummarizeResponse}).then((response) => {

                console.log('Image Generated Successfully');
                
                const imageUrl = `data:image/png;base64,${response}`;
        
                io.emit('broadcast-ImgBlob', { id: socket.username, msg: imageUrl });
                
                io.emit("GoToResult", response1);
                io.emit("TTS", response1);
              
              }).catch((error) => {
                  console.error('Error fetching image:', error);
              });

            });

        });

        //if response ok, go to result screen
      }

    });



});
  
server.listen(3000, () => {
  console.log('Server running at http://localhost:3000/');
});