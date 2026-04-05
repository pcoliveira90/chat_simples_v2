var login = "";
var sock = null;
var currentRoom = null;
var activeHistoryRoom = null;

$(document).ready(function() {
	window.ws = sock;

	const user = {
		nickname: '',
		message: '',
		receiver: '',
		type: '',
		privacy: false,
		room: ''
	};

	var messageBox = $('#messages-box');

	visibilityElement("formReg", "block");
	visibilityElement("formMessage", "none");

	sendRegistrar = function() {
		login = $('#inputUser').val();

		if (login == "") {
			this.alert("Por favor, preencher o login.");
			return;
		}

		sock = new WebSocket('ws://localhost:5001');
		window.ws = sock;

		sock.onopen = function() {
			userReg(user, login, sock);
			visibilityElement("formReg", "none");
			visibilityElement("formMessage", "block");
			messageBox.prepend('<div class="alert alert-success">' + formatTime() + 'Connection established.</div>');
		};

		sock.onclose = function() {
			messageBox.prepend('<div class="alert alert-danger">' + formatTime() + 'Connection closed.</div>');
		};

		sock.onerror = function(event) {
			messageBox.prepend('<div class="alert alert-danger">' + formatTime() + 'Unknown error.</div>');
			console.log(event);
		};

		sock.onmessage = function(event) {
			let obj = JSON.parse(event.data);
			resetReg(obj.status);
			updateSelect(obj.payload.listUser || []);
			updateRoomState(obj.payload);
			messageBox.prepend('<div class="alert alert-secondary">' + formatTime() + ' ' + obj.payload.message + '</div>');
		};
	};

	sendMessage = function() {
		var _message = $('#message-input').val();
		var _receive = $('#select-receive').val();
		var _private = $("#input-private").is(':checked');

		if (sock == null) {
			this.alert("Please register first.");
			return;
		}
		if (_message == '') {
			this.alert("Unable to send blank message.");
			return;
		}

		user.nickname = login;
		user.receiver = _receive;
		user.message = _message;
		user.privacy = _private;
		user.room = currentRoom || 'Lobby';

		if (_message == '/exit') {
			user.type = 'LEAVE_ROOM';
		} else if (_private) {
			user.type = 'NEW_MESSAGE';
		} else {
			user.type = 'ROOM_MESSAGE';
		}

		sock.send(JSON.stringify(user));
		$('#message-input').val('');
	};

	sendCreateRoom = function() {
		if (!sock) {
			this.alert("Please register first.");
			return;
		}
		var roomName = $('#input-room-name').val();
		if (!roomName || roomName.trim() === '') {
			this.alert("Enter a room name.");
			return;
		}
		sock.send(JSON.stringify({
			type: 'CREATE_ROOM',
			nickname: login,
			room: roomName.trim()
		}));
		$('#input-room-name').val('');
	};

	sendJoinRoom = function() {
		if (!sock) {
			this.alert("Please register first.");
			return;
		}
		var roomName = $('#select-room').val();
		sock.send(JSON.stringify({
			type: 'JOIN_ROOM',
			nickname: login,
			room: roomName
		}));
	};

	sendLeaveRoom = function() {
		if (!sock) {
			this.alert("Please register first.");
			return;
		}
		sock.send(JSON.stringify({
			type: 'LEAVE_ROOM',
			nickname: login
		}));
	};

	jQuery('#message-input').keypress(function(event) {
		var keycode = (event.keyCode ? event.keyCode : event.which);
		if (keycode == '13') {
			sendMessage();
		}
	});

	jQuery('#inputUser').keypress(function(event) {
		var keycode = (event.keyCode ? event.keyCode : event.which);
		if (keycode == '13') {
			sendRegistrar();
		}
	});
});

function updateRoomState(payload) {
	if (!payload || (payload.rooms === undefined && payload.room === undefined && payload.roomUsers === undefined && payload.history === undefined)) {
		return;
	}
	updateRoomSelect(payload.rooms || []);
	updateRoomUsers(payload.roomUsers || []);
	updateCurrentRoom(payload.room || null);
	renderRoomHistory(payload.room, payload.history || []);
}

function renderRoomHistory(roomName, history) {
	if (!roomName) {
		return;
	}
	if (activeHistoryRoom !== roomName) {
		activeHistoryRoom = roomName;
	}
	if (!Array.isArray(history) || history.length === 0) {
		return;
	}
	var historyMarkup = history.map((item) => '<div class="alert alert-light">' + formatTime() + ' ' + item + '</div>').join('');
	$('#messages-box').html(historyMarkup);
}

function updateCurrentRoom(roomName) {
	currentRoom = roomName;
	if (!roomName) {
		$('#current-room').text('Current: none');
		return;
	}
	$('#current-room').text('Current: ' + roomName);
	$('#select-room').val(roomName);
}

function updateRoomSelect(rooms) {
	$("#select-room").empty();
	if (!rooms || rooms.length === 0) {
		$('#select-room').append($('<option>', {
			value: 'Lobby',
			text: 'Lobby'
		}));
		return;
	}
	rooms.forEach((room) => {
		$('#select-room').append($('<option>', {
			value: room,
			text: room
		}));
	});
}

function updateRoomUsers(users) {
	$("#room-users").empty();
	if (!users || users.length === 0) {
		$('#room-users').append('<li class="list-group-item small text-muted">No users</li>');
		return;
	}
	users.forEach((roomUser) => {
		$('#room-users').append('<li class="list-group-item small">' + roomUser + '</li>');
	});
}

/* Carregar lista de usuarios */
function updateSelect(listUser){
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
	alert('Send normal messages to room. Use /exit to return to Lobby.');
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
	_user.room = 'Lobby';
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
