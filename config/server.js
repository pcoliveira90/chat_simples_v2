const express = require('express');
const path = require('path');
const Routes = require('../routes/routes.js')
const Chat = require('../app/chat.js');

class Server{
    constructor(){
        //configuracao do server
        this.app = express();
    }
    
    
    start(){
        
        this.app.use(express.json());
        
        this.app.use('/',new Routes().router);
        /* setar as variáveis 'view engine' e 'views' do express */
        this.app.set('view engine', 'ejs');
        this.app.set('views', './app/views');
        /* configurar o middleware express.static */
        this.app.use(express.static('./app/public'));

        const port = process.env.PORT || 8081; 

        this.app.listen(port, function(){
            console.log(`Server running at http://localhost:${port}/`);
        });

        
        new Chat().start();

    }

}

module.exports = Server;