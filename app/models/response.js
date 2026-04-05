module.exports = class Response{
    constructor(status, listLogin, msg, meta = {}){
        this.status = status;
        this.payload = {listUser:listLogin, message:msg, ...meta};
    }
}
