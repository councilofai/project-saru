const socket = io();
const container = document.getElementById("discussionContainer");

const councilMemberColors = {
  'AI_A': 'lightblue',
  'AI_B': 'lightgreen',
  'AI_C': 'lightpink',
  'AI_D': 'thistle',
  'AI_E': 'lightgoldenrodyellow',
  'AI_F': 'lightsteelblue',
  'Facilitator':'lightgrey'
};

socket.on('discussionState', (state) => {
  console.log("in client.js file w/ 'state': "+state);
  // Handling the state object in the front-end
  const {
    round,
    prompt,
    responses,
    disagreements,
    consensusReached
  } = state;
  
  const roundElement = document.createElement("p");
  roundElement.textContent = `Round: ${round}`;
  container.appendChild(roundElement);

  const consensusElement = document.createElement("p");
  consensusElement.textContent = consensusReached ? "Consensus reached!" : "No consensus reached yet";
  container.appendChild(consensusElement);

});

socket.on('messages', (msgs) => {
  console.log("in client.js file w/ 'msgs': "+msgs);
  // Handling the msgs object in the front-end
  const {
    round,
    agentId,
    text,
    typeOfMsg
  } = msgs;


  function playRoosterAudio() { 
    var x = document.getElementById("Sound_rooster");
    x.play(); 
  }
  function playGoatAudio() { 
    var x = document.getElementById("Sound_bahA");
    x.play(); 
  }
  function playCowAudio() { 
    var x = document.getElementById("Sound_cowMooA");
    x.play(); 
  }
  function playHorseAudio() { 
    var x = document.getElementById("Sound_horseNeigh");
    x.play(); 
  }
  function playCricketsAudio() { 
    var x = document.getElementById("Sound_crickets");
    x.play(); 
  }
  function playFarmAnimalsAAudio() { 
    var x = document.getElementById("Sound_FarmAnimalsA");
    x.play(); 
  }
  function playFarmAnimalsBAudio() { 
    var x = document.getElementById("Sound_FarmAnimalsB");
    x.play(); 
  }
  function playFarmAnimalsCAudio() { 
    var x = document.getElementById("Sound_FarmAnimalsC");
    x.play(); 
  }

  const delay = (milliseconds) => new Promise(resolve => setTimeout(resolve, milliseconds));
  const responseElement = document.createElement("div");
  if(agentId=="Facilitator"){
    if(typeOfMsg==="ConsensusReached"){
      for(i=0;i<3;i++){
        playGoatAudio();
        delay(500);
        playGoatAudio();
        delay(500);
        playCricketsAudio();
        delay(500);
        playRoosterAudio();
        delay(500);
        playGoatAudio();
        delay(500);
        playCowAudio();
        delay(500);
        playHorseAudio();
        delay(500);
        playFarmAnimalsAAudio();
        delay(500);
        playFarmAnimalsBAudio();
        delay(500);
        playFarmAnimalsCAudio();
        delay(500);
        playGoatAudio();
        delay(500);
        playCowAudio();
        delay(500);
        playGoatAudio();
        delay(500);
        playHorseAudio();
      };
      responseElement.innerHTML = `<strong>${agentId} - [Total Number of Rounds: ${round}]: </strong> ${text}`;
      responseElement.style.backgroundColor = councilMemberColors[agentId];
      responseElement.style.border = "0.3em solid darkblue";
    }else{
      responseElement.innerHTML = `<strong>${agentId}</strong> ${text}`;
      responseElement.style.backgroundColor = councilMemberColors[agentId];    
    };
  }else{
    if(typeOfMsg==="ConsensusReached"){
      responseElement.innerHTML = `<strong>${agentId}: </strong> ${text}`;
      responseElement.style.backgroundColor = councilMemberColors[agentId];
      responseElement.style.border = "0.3em solid darkblue";
    }else{
      responseElement.innerHTML = `<strong>${agentId}:</strong> ${text}`;
      responseElement.style.backgroundColor = councilMemberColors[agentId];    
    };    
  };
  container.appendChild(responseElement);
});