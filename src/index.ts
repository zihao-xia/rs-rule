import { registerLogTimer } from './log-timer';

function main() {
  // 注册扩展
  let ext = seal.ext.find('rs-rule');
  if (!ext) {
    ext = seal.ext.new('rs-rule', 'Conatsu', '1.0.0');
    seal.ext.register(ext);
  }

  // 注册日志计时功能
  registerLogTimer();

  // 编写指令
  const cmdSeal = seal.ext.newCmdItemInfo();
  cmdSeal.name = 'rs';
  cmdSeal.help =
    '固定2d6，输入“.rs<num>"，骰出结果大于等于num成功，小于num失败。2为大失败，12为大成功';

  cmdSeal.solve = (ctx, msg, cmdArgs) => {
    let border = cmdArgs.getArgN(1);
    switch (border) {
      case 'help': {
        const ret = seal.ext.newCmdExecuteResult(true);
        ret.showHelp = true;
        return ret;
      }
      default: {
        if (!border) {
          seal.replyToSender(ctx, msg, '命令格式错误');
          return seal.ext.newCmdExecuteResult(true);
        }
        const num = parseInt(border);
        if (isNaN(num)) {
          seal.replyToSender(ctx, msg, '请输入有效的数字！');
          return seal.ext.newCmdExecuteResult(true);
        }

        // 骰2d6
        const dice1 = Math.floor(Math.random() * 6) + 1;
        const dice2 = Math.floor(Math.random() * 6) + 1;
        const result = dice1 + dice2;

        // 获取技能名称（第二个参数）
        const skillName = cmdArgs.getArgN(2);

        // 判断结果
        let resultText = `${msg.sender.nickname}${
          skillName ? ` - 技能检定：${skillName}` : ''
        }\n骰点结果：${dice1}+${dice2}=${result}`;
        if (result === 2) {
          resultText += '（大失败）';
        } else if (result === 12) {
          resultText += '（大成功）';
        } else if (result >= num) {
          resultText += `（大于等于${num}）\n成功`;
        } else {
          resultText += `（小于${num}）\n失败`;
        }

        seal.replyToSender(ctx, msg, resultText);
        return seal.ext.newCmdExecuteResult(true);
      }
    }
  };

  // 注册命令
  ext.cmdMap['rs'] = cmdSeal;
}

main();
