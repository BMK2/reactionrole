const Discord = require('discord.js');
const MongoDB = require('@botsmk2/mongodb');
const { Logger } = require('mongodb');

class ReactionRoleModule {
  reactionMessages = [];

  constructor(client) {
    this.discordClient = client;
    this.client.on('commandPrefixUsed', (message) => {this.parseCommand(message)});
  }

  parseCommand(message) {
    const args = message.content.slice(process.env.PREFIX.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    switch(command) {
      case "rrcreate":
        this.reactionMessages.push(this.newReactionPost(message, args));
        break;
      case 'rraddrole':
        for (let rMessage of this.reactionMessages) {
          if (rMessage.messageID == args[0]) {
            rMessage.addRole(args[1], args[2]);
          }
        }
    }
  }

  newReactionPost(message, args) {
    const description = message.split(process.env.PREFIX + 'rrcreate')[1];
    const newMessage = new ReactionMessage (message.channel, description);
  }
}

class ReactionMessage {
    mongoose = require('mongoose');
    messageID;
    roles = [];
    schema = new this.mongoose.Schema({
      messageID: String,
      roles: [{
        roleID: String,
        emoji: String
      }]
    });

    constructor(channel, description) {
      let newEmbed = new Discord.MessageEmbed();
      newEmbed.setColor('GOLD');
      newEmbed.setDescription(description);
      channel.send(newEmbed).then(message => {
        console.log(`Created new rr message: ${message.id} | ${description}`);
        this.messageID = message.id;
      }).bind(this);
    }

    addRole(role, emoji) {
      
    }
}

class ReactionRole {
  roleID;
  emoji;
  
  constructor(roleID, emoji) {
    this.roleID = roleID;
    this.emoji = emoji;
  }
}


module.exports = ReactionRoleModule;