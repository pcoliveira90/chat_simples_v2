/* importar server */
'use strict'; // just to make sure
var WebSocketServer  = require('ws').Server;
var Response = require('../app/models/response');
class Chat{
    
    constructor(){
        this.server = new WebSocketServer({port:5001});
        this.clients = [];
        this.nicknames=[];
    }
    

    start(){
        this.server.on('connection', (ws)=>{
            let message;
            ws.send(JSON.stringify({status: "OK",payload:{listUser: this.nicknames,message : 'Welcome to the chat, enjoy :)'}}));
            ws.on('message', (data) => {

                try {
                    message = JSON.parse(data);
                } catch (e) {
                    this.sendError(ws, 'Wrong format');
                    return;
                }
                //mensagem
                if (message.type === 'NEW_MESSAGE')
                this.sendMessage(message,ws);
        
                //login
                if (message.type === 'NEW_USER'){
                    
                    var nickname = message.nickname;
                    if((this.nicknames).includes(nickname)){
                        this.sendRegError(ws, 'Sorry, the nickname <b>'+message.nickname+'</b> is already taken. Please choose a different one.');
                        return;
                    }else{
                        this.nicknames.push(message.nickname);
                        ws.username = message.nickname;
                        this.clients.push(ws);
                        this.sendInit(ws);
                        this.sendAllAlert ('<b>'+message.nickname+'</b> has joined.');
                    }
                }
                //sair
                if (message.type === 'EXIT_ROOM'){
                    var author = message.nickname;
        
                    if(this.nicknames.includes(author)){
                        this.nicknames.pop(message.nickname)
                        ws.username = message.nickname;
                        this.clients.pop(ws);
                        this.sendAllAlert ('<b>'+message.nickname+'</b> disconected.');
                        this.sendRegError(ws, 'The nickname <b>'+message.nickname+'</b> disconected. Bye!');
                        return;
                    }
                }
        
            });
            
            ws.on('close', (obj) =>{
                console.log('aqui  '+obj)
            });
        
            ws.on('error', (data) => {
              console.log('aqui s')
            });
        });

        
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
        let env = new Response("OK", this.nicknames, 'You are registered as '+ws.username+'.');
        ws.send(JSON.stringify(env));
    };
    sendMessage(_message, ws){
        
        if(_message.privacy ==true){
            this.sendSpecific (_message,ws);
        }else{
            this.sendAll (_message,ws);
        }
    }
    sendSpecific (_message,ws) {
        let env = new Response("OK", this.nicknames, '<b>'+ _message.nickname+'</b> says to <i>'+ _message.receiver +'</i> : '+_message.message);

        this.clients.forEach((client) => {
            if (client.readyState === 1 && client.username === _message.receiver) {
                client.send(JSON.stringify(env));
                ws.send(JSON.stringify(env));
            }
        });
    }
    
    
}

module.exports = Chat;