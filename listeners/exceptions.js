const vsprintf = require('sprintf-js').vsprintf;

var BotError = function(target, message, args) {
    this.name = 'BotError';
    this.target = target;
    this.message = vsprintf(message, [target].concat(args));
    this.args = args;
    this.stack = (new Error()).stack;
}
BotError.prototype.__proto__ = Error.prototype;

module.exports = BotError;