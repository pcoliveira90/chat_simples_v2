var WebSocket = require('ws');
describe('testing server chat', () => {

  test('  testing connection and registration', async () => {
    var sock       = new WebSocket('ws://localhost:5001')
    let user = {
      nickname  : 'USER03',
      message   : '',
      receiver  : '',
      type      : 'NEW_USER',
      privacy   : false
    }
     sock.onopen= function (event){
     sock.send(JSON.stringify(user));
    };

    return sock.onmessage   = function(event) {
      let obj =  JSON.parse(event.data);
      expect(obj.status).toBe("OK");
      
		}
  });

  test('  testing nickname registered', async () => {
    var sock       = new WebSocket('ws://localhost:5001')
    let user = {
      nickname  : 'USER01',
      message   : '',
      receiver  : '',
      type      : 'NEW_USER',
      privacy   : false
    }
     sock.onopen= function (event){
     sock.send(JSON.stringify(user));
     sock.send(JSON.stringify(user));
    };

    return sock.onmessage   = function(event) {
      let obj =  JSON.parse(event.data);
      expect(obj.status).toBe("NOK");
      
		}
  });

  
  
});