module.exports = class Response{
    constructor(status, listLogin, msg){
        this.status = status;
        this.payload = {listUser:listLogin, message:msg};
    }
}
