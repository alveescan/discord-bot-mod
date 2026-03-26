require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  AuditLogEvent,
  EmbedBuilder
} = require('discord.js');

const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration
  ]
});

const PREFIX = process.env.PREFIX || ".";

client.once("ready", () => {
  console.log(`${client.user.tag} olarak giriş yapıldı.`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();

  if (command === "join") {
  try {
    const member = await message.guild.members.fetch(message.author.id);
    const voiceChannel = member.voice.channel;

    console.log("VOICE:", voiceChannel ? voiceChannel.name : "YOK");

    if (!voiceChannel) {
      return message.reply("Seni seste göremiyorum kanka 😢");
    }

    joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
    });

    return message.reply(`Moderasyon botu girdi: ${voiceChannel.name} 🔊`);
  } catch (err) {
    console.log("JOIN HATA:", err);
    return message.reply("Giremedim 😢");
  }
}

  if (command === "ban") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return message.reply("Ban yetkin yok.");
    }

    const user =
      message.mentions.users.first() ||
      await client.users.fetch(args[0]).catch(() => null);

    if (!user) return message.reply("Bir kullanıcı etiketle ya da ID gir.");

    const reason = args.slice(1).join(" ") || "Sebep belirtilmedi";

    try {
      await message.guild.members.ban(user.id, { reason });
      await message.reply(`${user.tag} banlandı.`);

      const logChannel = message.guild.channels.cache.find(
        c => c.name === "ban-log"
      );

      if (logChannel) {
        logChannel.send(`**${user.tag}** adlı üye, **${message.author.tag}** tarafından **${reason}** sebebi ile yasaklandı.`);
      }
    } catch (err) {
      console.log(err);
      message.reply("Ban atarken hata oluştu.");
    }
  }

  if (command === "kick") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
      return message.reply("Kick yetkin yok.");
    }

    const user =
      message.mentions.users.first() ||
      await client.users.fetch(args[0]).catch(() => null);

    if (!user) return message.reply("Bir kullanıcı etiketle ya da ID gir.");

    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (!member) return message.reply("Bu kullanıcı sunucuda değil.");

    const reason = args.slice(1).join(" ") || "Sebep belirtilmedi";

    try {
      await member.kick(reason);
      await message.reply(`${user.tag} kicklendi.`);

      const logChannel = message.guild.channels.cache.find(
        c => c.name === "kick-log"
      );

      if (logChannel) {
        logChannel.send(`**${user.tag}** adlı üye, **${message.author.tag}** tarafından **${reason}** sebebi ile sunucudan atıldı.`);
      }
    } catch (err) {
      console.log(err);
      message.reply("Kick atarken hata oluştu.");
    }
  }

  if (command === "timeout") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return message.reply("Timeout yetkin yok.");
    }

    const user =
      message.mentions.users.first() ||
      await client.users.fetch(args[0]).catch(() => null);

    if (!user) return message.reply("Bir kullanıcı etiketle ya da ID gir.");

    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (!member) return message.reply("Bu kullanıcı sunucuda değil.");

    const minutes = parseInt(args[1]) || 10;
    const reason = args.slice(2).join(" ") || "Sebep belirtilmedi";

    try {
      await member.timeout(minutes * 60 * 1000, reason);
      await message.reply(`${user.tag} kullanıcısına ${minutes} dakika timeout atıldı.`);
    } catch (err) {
      console.log(err);
      message.reply("Timeout atarken hata oluştu.");
    }
  }
});

client.on("guildMemberUpdate", (oldMember, newMember) => {
  const oldRoles = oldMember.roles.cache;
  const newRoles = newMember.roles.cache;

  const addedRoles = newRoles.filter(role => !oldRoles.has(role.id));
  const removedRoles = oldRoles.filter(role => !newRoles.has(role.id));

  const logChannel = newMember.guild.channels.cache.find(
    c => c.name === "rol-log"
  );

  if (!logChannel) return;

  addedRoles.forEach(role => {
    logChannel.send(`**${newMember.user.tag}** kullanıcısına **${role.name}** rolü verildi.`);
  });

  removedRoles.forEach(role => {
    logChannel.send(`**${newMember.user.tag}** kullanıcısından **${role.name}** rolü alındı.`);
  });
});

client.on("channelCreate", async (channel) => {
  const logChannel = channel.guild.channels.cache.find(
    c => c.name === "kanal-log"
  );

  if (!logChannel) return;

  try {
    const fetchedLogs = await channel.guild.fetchAuditLogs({
      limit: 1,
      type: AuditLogEvent.ChannelCreate
    });

    const log = fetchedLogs.entries.first();
    const executor = log?.executor;

    logChannel.send(`**${channel.name}** adlı kanal, **${executor ? executor.tag : "Bilinmeyen"}** tarafından oluşturuldu.`);
  } catch (err) {
    console.log(err);
  }
});

client.login(process.env.TOKEN);