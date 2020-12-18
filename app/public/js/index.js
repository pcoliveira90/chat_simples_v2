$(document).ready(function() {
	var login ;
	var sock;
	window.ws      = sock
	const user = {
		nickname  : {type: String, required: true, max: 100},
		message   : {type: String},
		receiver  : {type: String, max: 100},
		type      : {type: String, required: true, max: 100},
		privacy   : {type: String, required: true, max: 100}
	}
	var messageBox = $('#messages-box')

	visibilityElement("formReg", "block");
	visibilityElement("formMessage", "none");
	
	
	sendRegistrar = function(){
		login = $('#inputUser').val()

	  	if(login ==""){
			this.alert("Por favor, preencher o login.");
			return;
	  	}else{
		  		sock       = new WebSocket('ws://localhost:5001')
		  		window.ws      = sock
		  		sock.onopen    = function(event) { 
					userReg(user, login, sock);
					visibilityElement("formReg", "none");
					visibilityElement("formMessage", "block");
			  		messageBox.prepend('<div class="alert alert-success">'+formatTime()+'Connection established.</div>') 
		}
  
		sock.onclose   = function(event) { 
			messageBox.prepend('<div class="alert alert-danger">'+formatTime() +'Connection closed.</div>') 
		}
		sock.onerror   = function(event) { 
			messageBox.prepend('<div class="alert alert-danger">'+formatTime() +'Unknown error.</div>'); console.log(event) 
		}
		sock.onmessage = function(event) { 
			let obj =  JSON.parse(event.data);
			resetReg(obj.status);
			updateSelect(obj.payload.listUser);
			messageBox.prepend('<div class="alert alert-secondary">'+formatTime() +' ' + obj.payload.message + '</div>'); console.log(event) 
		}
	  }
  
	  
	}
	

	sendMessage = function() {
		var _message = $('#message-input').val()  
		var _receive = $('#select-receive').val();
		var _private = $("#input-private").is(':checked');

		if(sock==null){
			this.alert("Please register first.");
			return;
	  	}else{
			  if(_message ==''){
				this.alert("Unable to send blank message.");
				return;
			  }
		}
	  	user.nickname = login;
		user.type ='NEW_MESSAGE';
		user.receiver = _receive;
		user.message = _message;
		user.privacy = _private;

		if(_message =='/exit')
			user.type ='EXIT_ROOM';

		sock.send(JSON.stringify(user));
		$('#message-input').val('') ;
	}
	/* enter message */
	jQuery('#message-input').keypress(function(event){

		var keycode = (event.keyCode ? event.keyCode : event.which);
		if(keycode == '13'){
			sendMessage();
		}
	
	});
 	/* enter login*/
	jQuery('#inputUser').keypress(function(event){

		var keycode = (event.keyCode ? event.keyCode : event.which);
		if(keycode == '13'){
			sendRegistrar();
		}
	
	});
	  
})
/* Carregar lista de usuarios */
function updateSelect(listUser){
	console.log(listUser);
	$("#select-receive").empty();
	$('#select-receive').append($('<option>', {
		value: 'All',
		text: 'All'
	}));
	listUser.forEach((user) => {
		$('#select-receive').append($('<option>', {
			value: user,
			text: user
		}));
	});
}

function help() {
	alert('To exit send /exit')
}

function formatTime() {
	var myDate = new Date().toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
	return myDate+" ";
  }

/* registrar usuario */
function userReg(_user, _login, _sock){
	_user.nickname = _login;
	_user.type ='NEW_USER';
	_user.receiver = 'all';
	_sock.send(JSON.stringify(_user));
}

/*definir visilidade de elementos da tela */
function visibilityElement(element, visible) {
	var x = document.getElementById(element);
	x.style.display = visible;
}
/* reset usuario / login */
function resetReg(data){
	if(data =='NOK_REG'){
		login = "";
		visibilityElement("formReg", "block");
		visibilityElement("formMessage", "none");
	}
}
