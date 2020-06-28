const Discord = require('discord.js');
const MongoDB = require('@botsmk2/mongodb');
const mongoose = require('mongoose');

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

class ReactionMessage {
    messageID = null;
    channelID;
    description = null;
    discordClient;
    roles = [];
    reactionCollector;
    
    constructor(discordClient, channelID, description) {
      this.discordClient = discordClient;
      this.description = description;
      this.channelID = channelID;
    }

    post(channel) {
      channel.send({embed: this.createEmbed()}).then(function(message){
        this.messageID = message.id;
        this.channelID = message.channel.id;
        message.edit({embed: this.createEmbed()});
        this.addReactionCollector(message);
        this.save();
      }.bind(this));
    }

    addReactionCollector(message) {
      this.reactionCollector = message.createReactionCollector((reaction, user) => true, {dispose: true});
      this.reactionCollector.on('collect', function(reaction, user) {
        if(!user.bot) {
          console.log(`A reaction has been collected: ${reaction} from user: ${user}`);
          this.giveUserRole(reaction, user);
        } else {
          console.log(`Bot added reaction: ${reaction}`);
        }
      }.bind(this));
      this.reactionCollector.on('remove', function(reaction, user) {
        if(!user.bot) {
          console.log(`A reaction has been removed: ${reaction} from user: ${user}`);
          this.takeUserRole(reaction, user);
        } else {
          console.log(`Bot added reaction: ${reaction}`);
        }
      }.bind(this));
    }

    giveUserRole(reaction, user) {
      // TODO: Make sure bot an actually give user the role
      reaction.message.guild.member(user).roles.add(this.parseReaction(reaction));
    }

    takeUserRole(reaction, user) {
      // TODO: Make sure bot an actually give user the role
      reaction.message.guild.member(user).roles.remove(this.parseReaction(reaction));
    }

    parseReaction(reaction) {
      let reactionID;
      if(reaction.emoji.id == null) {
        reactionID = reaction.emoji.name;
      } else {
        reactionID = reaction.emoji.id;
      }
      let reactionRole;
      this.roles.forEach(role => {if(role.emoji == reactionID) reactionRole = role});
      return reaction.message.guild.roles.cache.get(reactionRole.getRoleID());
    }

    createEmbed() {
      let embed = new Discord.MessageEmbed();
      embed.setColor('GOLD');
      if (this.description != null) embed.setDescription(this.description);
      if (this.messageID != null) embed.setFooter(`ID: ${this.messageID}`);

      let roleList = "";
      this.roles.forEach(role => {
        if (role.getCustom()) {
          roleList = `${roleList}${this.discordClient.emojis.cache.get(role.getEmoji())} | ${role.getMentionable()} \n`;
        } else {
          roleList = `${roleList}${role.getEmoji()} | ${role.getMentionable()} \n`;
        }
      });
      if (roleList != "") {
        embed.addField('Roles', roleList);
      } else {
        embed.addField('Roles', '\u200B');
      }
      return embed;
    }

    debug() {
      return `${this.messageID} | ${this.channelID} | ${this.roles}`;
    }

    getMessageID() {
      return this.messageID;
    }

    setMessageID(messageID) {
      this.messageID = messageID;
    }

    getChannelID() {
      return this.channelID;
    }

    addRole(channel, role, emoji) {
      // TODO: Need to add a check that the emoji is available to the bot
      const rRole = new ReactionRole(role.id, emoji, role.toString());
      this.roles.push(rRole);
      this.save();
      channel.messages.fetch(this.messageID).then(function(message) {
        // message.react(emoji);
        if(rRole.getCustom()) {
          message.react(this.discordClient.emojis.cache.get(rRole.getEmoji()));
        } else {
          message.react(rRole.getEmoji());
        }
        message.edit({embed: this.createEmbed()});
      }.bind(this)).catch(console.error);
    }

    removeRole(channel, roleToRemove) {
      let emojiToRemove;
      this.roles.forEach(role => {
        if(role.getRoleID() == roleToRemove.id) {
          emojiToRemove = role.getEmoji();
          this.roles.splice(this.roles.indexOf(role), 1);
        }
      });
      this.save();
      channel.messages.fetch(this.messageID).then(function(message) {
        message.reactions.cache.get(emojiToRemove).remove().catch(error => console.error('Failed to remove reactions: ', error));
        message.edit({embed: this.createEmbed()});
      }.bind(this)).catch(console.error);
    }

    loadRole(reactionRole) {
      this.roles.push(reactionRole);
    }

    save() {
      const MessageModel = this.discordClient.db.botDB.model('ReactionMessage', reactionMessageSchema);
      let rolesToSave = [];
      this.roles.forEach(role => {
        rolesToSave.push({
          roleID: role.getRoleID(),
          emoji: role.getEmoji(),
          custom: role.getCustom(),
          mentionable: role.getMentionable()
        });
      });
      try {
        MessageModel.findOne({messageID: this.messageID}, function(error, savedMessage) {
          if(savedMessage) {
            MessageModel.updateOne({messageID: this.messageID}, {
              messageID: this.messageID,
              channelID: this.channelID,
              description: this.description,
              roles: rolesToSave
            }, function(error, result) {
              if(error) console.log(error);
            });
          } else {
            let messageToSave = new MessageModel({
              messageID: this.messageID,
              channelID: this.channelID,
              description: this.description,
              roles: rolesToSave
            });
            messageToSave.save(function(error) {
              if (error) console.log(`Error saving reaction message: ${error}`);
            });
          }
        }.bind(this));
      } catch (error) {
        console.log(`Error saving reaction message to mongodb: ${error}`);
      }
    }
}

class ReactionRole {
  roleID;
  emoji;
  custom;
  mentionable;
  
  constructor(roleID, emoji, mentionable) {
    const emojiID = emoji.match(/\d+/g);
    if(emojiID == null) {
      this.emoji = emoji;
      this.custom = false;
    } else {
      this.custom = true;
      this.emoji = emojiID.pop();
    }

    this.roleID = roleID;
    this.mentionable = mentionable;
  }

  getRoleID() {
    return this.roleID;
  }

  getMentionable() {
    return this.mentionable;
  }

  getEmoji() {
    return this.emoji;
  }

  getCustom() {
    return this.custom;
  }
}


module.exports = ReactionRoleModule;