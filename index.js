const Discord = require('discord.js');
const MongoDB = require('@botsmk2/mongodb');
const mongoose = require('mongoose');
const ReactionRole = require('./classes/ReactionRole');
const ReactionMessage = require('./classes/ReactionMessage');

const reactionMessageSchema = new mongoose.Schema({
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

class ReactionRoleModule {
  reactionMessages = [];

  constructor(client) {
    this.discordClient = client;
    this.discordClient.on('commandPrefixUsed', (message) => {this.parseCommand(message)});
    this.loadReactionMessages();
  }

  parseCommand(message) {
    const args = message.content.slice(process.env.PREFIX.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    switch(command) {
      case "rrdebug": 
        this.reactionMessages.forEach(rrMessage => {
          message.channel.send(rrMessage.debug());
        });
        break;
      case "rrcreate": // rrcreate [Description]
        const reactionPost = this.newReactionPost(message);
        this.reactionMessages.push(reactionPost);
        break;
      case "rrdelete": // rrdelete <Message ID>
        this.reactionMessages.forEach(reactionMessage => {
          this.discordClient.guilds.cache.get(process.env.HOME_GUILD).channels.cache.get(reactionMessage.getChannelID()).messages.fetch(reactionMessage.getMessageID()).then(function(message){
            message.delete();
          });
          const MessageModel = this.discordClient.db.botDB.model('ReactionMessage', reactionMessageSchema);
          MessageModel.deleteOne({messageID: reactionMessage.getMessageID()});
          this.reactionMessages.splice(this.reactionMessages.indexOf(reactionMessage), 1);
        });
        break;
      case 'rraddrole': // rradrolle <Message ID> <Mentioned Role> <Emoji>
        this.reactionMessages.forEach(rrMessage => {
          if (rrMessage.getMessageID() == args[0]) {
            const messageChannel = message.guild.channels.cache.get(rrMessage.getChannelID());
            const mentionedRole = message.mentions.roles.first();
            rrMessage.addRole(messageChannel, mentionedRole, args[2]);
          }
        });
        break;
      case 'rrremoverole': // rrremoverole <Message ID> <Mentioned Role>
        this.reactionMessages.forEach(rrMessage => {
          if (rrMessage.getMessageID() == args[0]) {
            const messageChannel = message.guild.channels.cache.get(rrMessage.getChannelID());
            const mentionedRole = message.mentions.roles.first();
            rrMessage.removeRole(messageChannel, mentionedRole);
          }
        });
        break;
    }
    message.delete();
  }

  newReactionPost(message) {
    const description = message.content.split(process.env.PREFIX + 'rrcreate')[1];
    const newMessage = new ReactionMessage (this.discordClient, message.channel.id, description);
    newMessage.post(message.channel);
    return newMessage;
  }

  loadReactionMessages() {
    const MessageModel = this.discordClient.db.botDB.model('ReactionMessage', reactionMessageSchema);
    MessageModel.find(function(error, docs) {
      docs.forEach(doc => {
        let reactionMessage = new ReactionMessage(this.discordClient, doc.channelID, doc.description);
        reactionMessage.setMessageID(doc.messageID);
        this.discordClient.guilds.cache.get(process.env.HOME_GUILD).channels.cache.get(reactionMessage.getChannelID()).messages.fetch(reactionMessage.getMessageID()).then(function(message){
            reactionMessage.addReactionCollector(message);
          }.bind(reactionMessage));
        doc.roles.forEach(role => {
          reactionMessage.loadRole(new ReactionRole(role.roleID, role.emoji, role.mentionable));
        });
        this.reactionMessages.push(reactionMessage);
      });
      console.log(`Loaded ${this.reactionMessages.length} reaction messages`);
    }.bind(this));
  }
}

module.exports = ReactionRoleModule;