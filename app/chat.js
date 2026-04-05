/* importar server */
'use strict'; // just to make sure
var WebSocketServer  = require('ws').Server;
var Response = require('../app/models/response');
class Chat{
    
    constructor(){
        this.server = new WebSocketServer({port:5001});
        this.clients = [];
        this.nicknames=[];
        this.rooms = new Map();
        this.userRoom = new Map();
        this.defaultRoom = 'Lobby';
        this.historyLimit = 20;
        this.ensureRoom(this.defaultRoom);
    }
    

    start(){
        this.server.on('connection', (ws)=>{
            let message;
            ws.send(JSON.stringify(new Response(
                "OK",
                this.nicknames,
                'Welcome to the chat, enjoy :)',
                {rooms: this.getRoomList(), room: null, roomUsers: [], history: []}
            )));
            ws.on('message', (data) => {

                try {
                    message = JSON.parse(data);
                } catch (e) {
                    this.sendError(ws, 'Wrong format');
                    return;
                }
                if (message.type === 'NEW_MESSAGE') {
                    this.sendMessage(message,ws);
                    return;
                }
                if (message.type === 'ROOM_MESSAGE') {
                    this.sendRoomMessage(message, ws);
                    return;
                }
                if (message.type === 'NEW_USER'){
                    this.registerUser(message, ws);
                    return;
                }
                if (message.type === 'CREATE_ROOM'){
                    this.createRoomAndJoin(message, ws);
                    return;
                }
                if (message.type === 'JOIN_ROOM'){
                    this.joinRoom(ws, message.room);
                    return;
                }
                if (message.type === 'LEAVE_ROOM' || message.type === 'EXIT_ROOM'){
                    this.leaveRoom(ws);
                    return;
                }
                if (message.type === 'LIST_ROOMS'){
                    this.sendRoomCatalog(ws, 'Available rooms loaded.');
                    return;
                }
                this.sendError(ws, 'Unknown operation');
            });
            
            ws.on('close', () =>{
                this.disconnectUser(ws);
            });
        
            ws.on('error', () => {
              this.disconnectUser(ws);
            });
        });

        
    }
    ensureRoom(roomName){
        if(!this.rooms.has(roomName)){
            this.rooms.set(roomName, {users: new Set(), history: []});
        }
        return this.rooms.get(roomName);
    }
    getRoomList(){
        return Array.from(this.rooms.keys()).sort();
    }
    getRoomNameFromMessage(rawRoom){
        if (!rawRoom || typeof rawRoom !== 'string') {
            return this.defaultRoom;
        }
        const cleanName = rawRoom.trim();
        if (cleanName.length === 0) {
            return this.defaultRoom;
        }
        return cleanName;
    }
    isRegistered(ws){
        return Boolean(ws && ws.username && this.nicknames.includes(ws.username));
    }
    getRoomUsers(roomName){
        return Array.from(this.ensureRoom(roomName).users).sort();
    }
    sendRoomState(ws, status, message){
        const roomName = this.userRoom.get(ws.username) || this.defaultRoom;
        const room = this.ensureRoom(roomName);
        const env = new Response(
            status,
            this.nicknames,
            message,
            {
                rooms: this.getRoomList(),
                room: roomName,
                roomUsers: Array.from(room.users).sort(),
                history: room.history
            }
        );
        ws.send(JSON.stringify(env));
    }
    broadcastRoomState(roomName, message){
        this.clients.forEach((client) => {
            if (client.readyState === 1 && this.userRoom.get(client.username) === roomName) {
                this.sendRoomState(client, "OK", message);
            }
        });
    }
    sendRoomCatalog(ws, message){
        const roomName = this.userRoom.get(ws.username) || null;
        const room = roomName ? this.ensureRoom(roomName) : {users: new Set(), history: []};
        const env = new Response(
            "OK",
            this.nicknames,
            message,
            {
                rooms: this.getRoomList(),
                room: roomName,
                roomUsers: Array.from(room.users).sort(),
                history: room.history
            }
        );
        ws.send(JSON.stringify(env));
    }
    registerUser(message, ws){
        var nickname = message.nickname;
        if (!nickname || typeof nickname !== 'string' || nickname.trim() === '') {
            this.sendRegError(ws, 'Please choose a valid nickname.');
            return;
        }
        nickname = nickname.trim();
        if((this.nicknames).includes(nickname)){
            this.sendRegError(ws, 'Sorry, the nickname <b>'+nickname+'</b> is already taken. Please choose a different one.');
            return;
        }

        this.nicknames.push(nickname);
        ws.username = nickname;
        this.clients.push(ws);
        this.joinRoom(ws, this.defaultRoom, true);
        this.sendInit(ws);
        this.sendAllAlert ('<b>'+nickname+'</b> has joined the chat.');
    }
    createRoomAndJoin(message, ws){
        if (!this.isRegistered(ws)) {
            this.sendError(ws, 'Please register before creating rooms.');
            return;
        }
        const roomName = this.getRoomNameFromMessage(message.room);
        if (this.rooms.has(roomName)) {
            this.sendError(ws, 'Room <b>'+roomName+'</b> already exists.');
            return;
        }
        this.ensureRoom(roomName);
        this.joinRoom(ws, roomName);
    }
    joinRoom(ws, roomName, isInitialJoin = false){
        if (!this.isRegistered(ws)) {
            this.sendError(ws, 'Please register before joining rooms.');
            return;
        }

        const destinationRoom = this.getRoomNameFromMessage(roomName);
        const previousRoom = this.userRoom.get(ws.username);

        if (previousRoom === destinationRoom) {
            this.sendRoomState(ws, "OK", 'You are already in <b>'+destinationRoom+'</b>.');
            return;
        }

        if (previousRoom) {
            const prevRoomState = this.ensureRoom(previousRoom);
            prevRoomState.users.delete(ws.username);
        }

        const targetRoom = this.ensureRoom(destinationRoom);
        targetRoom.users.add(ws.username);
        this.userRoom.set(ws.username, destinationRoom);

        if (previousRoom && !isInitialJoin) {
            this.broadcastRoomState(previousRoom, '<b>'+ws.username+'</b> left room <b>'+previousRoom+'</b>.');
        }

        this.broadcastRoomState(destinationRoom, '<b>'+ws.username+'</b> entered room <b>'+destinationRoom+'</b>.');
    }
    leaveRoom(ws){
        if (!this.isRegistered(ws)) {
            this.sendError(ws, 'Please register before leaving rooms.');
            return;
        }
        const currentRoom = this.userRoom.get(ws.username);
        if (!currentRoom) {
            this.sendError(ws, 'You are not in a room.');
            return;
        }
        if (currentRoom === this.defaultRoom) {
            this.sendRoomState(ws, "OK", 'You are already in <b>'+this.defaultRoom+'</b>.');
            return;
        }
        this.joinRoom(ws, this.defaultRoom);
    }
    disconnectUser(ws){
        if (!ws || !ws.username) {
            return;
        }
        const username = ws.username;
        const currentRoom = this.userRoom.get(username);
        if (currentRoom) {
            const room = this.ensureRoom(currentRoom);
            room.users.delete(username);
            this.userRoom.delete(username);
            this.broadcastRoomState(currentRoom, '<b>'+username+'</b> disconnected.');
        }

        this.nicknames = this.nicknames.filter((nickname) => nickname !== username);
        this.clients = this.clients.filter((client) => client !== ws);
        ws.username = null;
        this.sendAllAlert ('<b>'+username+'</b> disconnected.');
    }
    pushRoomHistory(roomName, formattedMessage){
        const room = this.ensureRoom(roomName);
        room.history.push(formattedMessage);
        if (room.history.length > this.historyLimit) {
            room.history = room.history.slice(room.history.length - this.historyLimit);
        }
    }
    sendRoomMessage(_message, ws){
        if (!this.isRegistered(ws)) {
            this.sendError(ws, 'Please register first.');
            return;
        }
        const roomName = this.userRoom.get(ws.username);
        if (!roomName) {
            this.sendError(ws, 'Join a room before sending messages.');
            return;
        }
        if (!_message.message || String(_message.message).trim() === '') {
            this.sendError(ws, 'Unable to send blank message.');
            return;
        }

        const textMessage = String(_message.message).trim();
        const formattedMessage = '<b>'+ws.username+'</b> in <i>'+roomName+'</i> : '+textMessage;
        this.pushRoomHistory(roomName, formattedMessage);
        this.broadcastRoomState(roomName, formattedMessage);
    }
    sendAll (_message,ws) {
        let env =new Response("OK", this.nicknames, '<b>'+ _message.nickname+'</b> says to <i>'+ _message.receiver +'</i> : '+_message.message);
            
        this.clients.forEach((client) => {
        if (client.readyState ===1) 
            client.send(JSON.stringify(env));
        });
    }
    
    sendAllAlert (_message) {
        let env =new Response("OK", this.nicknames, _message);
        this.clients.forEach((client) => {
            if (client.readyState ===1) {
                client.send(JSON.stringify(env));
            }
        });
    }
    sendRegError(ws, _message) {
        let env = new Response("NOK_REG", this.nicknames, _message);
        ws.send(JSON.stringify(env));
    };
    
    sendError (ws, _message) {
        let env = new Response("NOK", this.nicknames, _message);
        console.log(env);
        ws.send(JSON.stringify(env));
    };
    
    sendInit (ws){
        let env = new Response("OK", this.nicknames, 'You are registered as '+ws.username+'.', {
            rooms: this.getRoomList(),
            room: this.userRoom.get(ws.username),
            roomUsers: this.getRoomUsers(this.userRoom.get(ws.username)),
            history: this.ensureRoom(this.userRoom.get(ws.username)).history
        });
        ws.send(JSON.stringify(env));
    };
    sendMessage(_message, ws){
        if(_message.privacy ==true){
            this.sendSpecific (_message,ws);
            return;
        }
        this.sendRoomMessage(_message, ws);
    }
   sendSpecific (_message,ws) {
    if (!this.isRegistered(ws)) {
        this.sendError(ws, 'Please register first.');
        return;
    }
    if (!_message.receiver || _message.receiver === 'All') {
        this.sendError(ws, 'Choose a valid recipient for private message.');
        return;
    }
    let env = new Response("OK", this.nicknames, '<b>'+ _message.nickname+'</b> says privately to <i>'+ _message.receiver +'</i> : '+_message.message);
    let sentToReceiver = false;

    this.clients.forEach((client) => {
        if (client.readyState === 1 && client.username === _message.receiver) {
            client.send(JSON.stringify(env));
            sentToReceiver = true;
        }
    });

    if (sentToReceiver && ws.readyState === 1) {
        ws.send(JSON.stringify(env));
    }

    if (!sentToReceiver) {
        this.sendError(ws, 'User <b>'+_message.receiver+'</b> is offline.');
    }
}
    
    
}

module.exports = Chat;
