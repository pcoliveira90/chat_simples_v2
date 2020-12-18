module.exports = class User{
    constructor(nickname, message, receiver, type, privacy){
        this.nickname = nickname;
        this.message = message;
        this.receiver = receiver;
        this.type = type;
        this.privacy = privacy;
    }
}