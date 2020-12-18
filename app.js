const Server = require('./config/server');

class App{
    constructor(){}
    
    start(){
        new Server().start();
    }
}
new App().start();
