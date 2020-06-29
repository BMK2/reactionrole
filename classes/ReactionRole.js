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

module.exports = ReactionRole;