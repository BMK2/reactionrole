const mongoose = require('mongoose');

module.exports = new mongoose.Schema({
  messageID: String,
  channelID: String,
  description: String,
  roles: [{
    roleID: String,
    emoji: String,
    custom: Boolean,
    mentionable: String
  }]
});