const socket = io();

const input = document.getElementById('input');
const messages = document.getElementById('messages');
const konsol = document.getElementById('console');
const joinButton = document.getElementById('join');
const GenImage = document.getElementById('generatedImage');
const usernametext = document.getElementById('usernamelabel');
const playertable = document.getElementById('PlayerTable');

const ReadyButton = document.getElementById('ReadyButton');
const CancelReadyButton = document.getElementById('CancelReadyButton');
const StartButton = document.getElementById('StartGame');
const SubmitButton = document.getElementById('SubmitButton');
const PlayerCounter = document.getElementById('PlayerCounter');

function CreateUsername(){
  document.getElementById('lobby-container').style.display = 'none';
  document.getElementById('mainmenu-container').style.display = 'none';
  document.getElementById('username-container').style.display = 'flex';
}

function MainMenu(){
  document.getElementById('lobby-container').style.display = 'none';
  document.getElementById('username-container').style.display = 'none';
  document.getElementById('mainmenu-container').style.display = 'flex';
}

function Join(){
    const username = document.getElementById('username').value;

    if (username) {
        socket.emit('join', username);
        document.getElementById('username').value = '';
        usernametext.innerHTML = username;
    } else {
        alert('Please enter a username');
    }
}

socket.on('user-joined', ({id, PlayerList, msg, status }) => {

  if(status=="success"){
    document.getElementById('username-container').style.display = 'none';
    document.getElementById('lobby-container').style.display = 'flex';
    konsol.textContent += `\n${msg}`;
  }else{
    MainMenu();
    usernametext.innerHTML = '';
  }

  playertable.innerHTML = '';
  PlayerList.forEach(element => {
    playertable.innerHTML +=  "<tr id=\"" + element.name + "\">         "+
                              "<td>" + element.name + "</td>              "+
                              "<td>" + element.status + "</td>              "+
                              "</tr>        ";
  });

});

socket.on('other-user-joined', ({id, PlayerList, msg, status }) => {
  konsol.textContent += `\n${msg}`;

  playertable.innerHTML = '';
  PlayerList.forEach(element => {
    playertable.innerHTML +=  "<tr id=\"" + element.name + "\">         "+
                              "<td>" + element.name + "</td>              "+
                              "<td>" + element.status + "</td>              "+
                              "</tr>        ";
  });
});

socket.on('user-disconnected', ({ name, msg }) => {
  konsol.textContent += `\n${msg}`;
  document.getElementById(name).remove();
});




function Send(){
  // if(input.value[0] == "/"){
  //   socket.emit('send-ImgPrompt', input.value);
  //   input.value = '';
  // } else{
    socket.emit('send-message', input.value);
    input.value = '';
  // }
};

socket.on('broadcast-ImgBlob', ({ id, msg }) => {
  GenImage.style.display = 'block';
  GenImage.src = msg;
});

socket.on('broadcast-message', ({ id, msg }) => {
  messages.textContent += `${id}: ${msg}` + '\n';
});






function Ready(){
  socket.emit('ready');
}

socket.on('user-ready', ({ PlayerList, msg }) => {
  konsol.textContent += `\n${msg}`;

  playertable.innerHTML = '';
  PlayerList.forEach(element => {
    playertable.innerHTML +=  "<tr id=\"" + element.name + "\">         "+
                              "<td>" + element.name + "</td>              "+
                              "<td>" + element.status + "</td>              "+
                              "</tr>        ";
  });

});

socket.on('user-ButtonReady', () => {
  ReadyButton.style.display = "none";
  CancelReadyButton.style.display = "block";
});

function CancelReady(){
  socket.emit('unready');
}

socket.on('user-unready', ({ PlayerList, msg }) => {
  konsol.textContent += `\n${msg}`;

  playertable.innerHTML = '';
  PlayerList.forEach(element => {
    playertable.innerHTML +=  "<tr id=\"" + element.name + "\">         "+
                              "<td>" + element.name + "</td>              "+
                              "<td>" + element.status + "</td>              "+
                              "</tr>        ";
  });

});

socket.on('user-ButtonUnready', () => {
  ReadyButton.style.display = "block";
  CancelReadyButton.style.display = "none";
});


socket.on('user-StartButton', () => {
  StartButton.style.display = "block";
});

socket.on('user-HideStartButton', () => {
  StartButton.style.display = "none";
});





function StartGame(){
  socket.emit('StartGame');
}

socket.on('GoToGame', () => {
  document.getElementById('PromptInput').value = '';
  document.getElementById('lobby-container').style.display = 'none';
  document.getElementById('username-container').style.display = 'none';
  document.getElementById('mainmenu-container').style.display = 'none';
  document.getElementById('game-container').style.display = 'flex';

  socket.emit('ChangeOngoingStatus');
});




function Submit(){
  socket.emit('Submit', document.getElementById('PromptInput').value);
}

socket.on('Hide-SubmitButton', (prompt, PlayerSubmitted, Players) => {
  SubmitButton.style.display = "none";
  PlayerCounter.innerHTML = "Waiting for other player: "+PlayerSubmitted+"/"+Players.length;
  PlayerCounter.style.display = "block";
  socket.emit('UpdateAllSubmittedPlayer', {msg: "Waiting for other player: "+PlayerSubmitted+"/"+Players.length});
  socket.emit('PushThePrompt', prompt);
});

socket.on('UpdateSubmitted', (msg) => {
  PlayerCounter.innerHTML = msg;
});


socket.on('GoToLoading', () => {
  
  document.getElementById('lobby-container').style.display = 'none';
  document.getElementById('username-container').style.display = 'none';
  document.getElementById('mainmenu-container').style.display = 'none';
  document.getElementById('game-container').style.display = 'none';
  document.getElementById('loading-container').style.display = 'flex';
});









function typeWriter(text, element) {
  let index = 0;
  element.value = ''; // Clear the textarea

  const interval = setInterval(() => {
      if (index < text.length) {
          element.value += text.charAt(index); // Add one character
          index++;
      } else {
          clearInterval(interval); // Stop the interval when done
      }
  }, 60); // Adjust the speed (in milliseconds)
}



function textToSpeech(text) {
  let utterance = new SpeechSynthesisUtterance(text);
  let voices = speechSynthesis.getVoices();
  
  // Select a specific voice (you can change the index or use a specific name)
  let selectedVoice = voices.find(voice => voice.name === 'Google US English'); // Change to desired voice name
  
  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  utterance.rate = 1.0;
  
  speechSynthesis.speak(utterance);
}

window.textToSpeech = textToSpeech;

window.addEventListener('beforeunload', () => {
  synth.cancel(); // Stop speaking before refresh
});



socket.on('GoToResult', (response) => {
  document.getElementById('result-textarea').value = '';

  document.getElementById('lobby-container').style.display = 'none';
  document.getElementById('username-container').style.display = 'none';
  document.getElementById('mainmenu-container').style.display = 'none';
  document.getElementById('game-container').style.display = 'none';
  document.getElementById('loading-container').style.display = 'none';

  document.getElementById('ThemeSong').volume = 0.35;
  document.getElementById('ThemeSong').play();

  typeWriter(response, document.getElementById('result-textarea'));

  document.getElementById('result-container').style.display = 'flex';

});


socket.on('TTS', (response) => {
  textToSpeech(response);
});



function Exit(){
  document.getElementById('result-textarea').value = '';
  location.reload();
}
