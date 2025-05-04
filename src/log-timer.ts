import {
  startTimer,
  pauseTimer,
  endTimer,
  getTimerResult,
  formatTime,
} from './utils';

/**
 * 日志计时插件
 * 在日志开启时（.log new 或 .log on）开始计时
 * 在 .log off 时暂停计时并设置计时变量
 * 在 .log halt / .log end 时结束计时并设置计时变量
 * 用户可通过变量 $t日志_<日志名>_时长 或 $t当前日志时长 获取时间
 */
export function registerLogTimer() {
  // 注册扩展
  let ext = seal.ext.find('log-timer');
  if (!ext) {
    ext = seal.ext.new('log-timer', 'Conatsu', '1.0.0');
    seal.ext.register(ext);
  }

  // 存储当前群组正在使用的日志名称
  const currentLogs = new Map<string, string>();

  // 将时间保存为变量并显示调试信息
  const saveTimeAsVariable = (
    ctx: seal.MsgContext,
    logName: string,
    totalTime: number,
    formatted: string
  ) => {
    if (!ctx.group) return;

    try {
      // 为了确保变量设置成功，我们先尝试设置一个测试变量
      seal.vars.intSet(ctx, `$t测试变量`, 12345);
      const [testVal, testSuccess] = seal.vars.intGet(ctx, `$t测试变量`);

      // 保存毫秒数为临时变量
      seal.vars.intSet(ctx, `$t日志_${logName}_时长_毫秒`, totalTime);

      // 保存格式化的时间字符串为临时变量
      seal.vars.strSet(ctx, `$t日志_${logName}_时长`, formatted);

      // 同时设置一个当前日志时长变量，方便直接访问
      seal.vars.intSet(ctx, `$t当前日志时长_毫秒`, totalTime);
      seal.vars.strSet(ctx, `$t当前日志时长`, formatted);

      // 读取回变量值进行验证
      const [msVal, msSuccess] = seal.vars.intGet(
        ctx,
        `$t日志_${logName}_时长_毫秒`
      );
      const [strVal, strSuccess] = seal.vars.strGet(
        ctx,
        `$t日志_${logName}_时长`
      );

      // 调试信息
      seal.replyToSender(
        ctx,
        {
          message: '',
          platform: '',
          messageType: 'private',
          groupId: '',
          guildId: '',
          time: 0,
          rawId: '',
          sender: { nickname: '', userId: '' },
        },
        `调试-变量设置：日志=${logName}, 时长=${totalTime}毫秒, 格式化=${formatted}\n` +
          `测试变量：${testVal}(成功=${testSuccess})\n` +
          `读取检查：毫秒=${msVal}(成功=${msSuccess}), 字符串=${strVal}(成功=${strSuccess})`
      );

      // 返回计时结果，确保用户能看到
      seal.replyToSender(
        ctx,
        {
          message: '',
          platform: '',
          messageType: 'private',
          groupId: '',
          guildId: '',
          time: 0,
          rawId: '',
          sender: { nickname: '', userId: '' },
        },
        `日志「${logName}」时长：${formatted}`
      );
    } catch (e) {
      // 记录详细错误信息
      const errorMsg = e instanceof Error ? e.message : String(e);
      seal.replyToSender(
        ctx,
        {
          message: '',
          platform: '',
          messageType: 'private',
          groupId: '',
          guildId: '',
          time: 0,
          rawId: '',
          sender: { nickname: '', userId: '' },
        },
        `变量设置失败：${errorMsg}\n请使用.text {$t日志_${logName}_时长}查看是否设置成功`
      );
    }
  };

  // 添加一个新的测试指令
  const cmdTest = seal.ext.newCmdItemInfo();
  cmdTest.name = 'logtime';
  cmdTest.help = '测试日志时间变量';
  cmdTest.solve = (ctx, msg, cmdArgs) => {
    // 获取指定的日志名
    const logName = cmdArgs.getArgN(1) || '';
    if (!logName) {
      seal.replyToSender(ctx, msg, '请指定日志名称');
      return seal.ext.newCmdExecuteResult(true);
    }

    if (!ctx.group) {
      seal.replyToSender(ctx, msg, '该命令只能在群聊中使用');
      return seal.ext.newCmdExecuteResult(true);
    }

    // 获取当前值
    const [msVal, msSuccess] = seal.vars.intGet(
      ctx,
      `$t日志_${logName}_时长_毫秒`
    );
    const [strVal, strSuccess] = seal.vars.strGet(
      ctx,
      `$t日志_${logName}_时长`
    );

    // 测试设置一个值
    const testTime = Date.now();
    const testFormatted = formatTime(testTime);
    seal.vars.intSet(ctx, `$t日志_${logName}_时长_毫秒`, testTime);
    seal.vars.strSet(ctx, `$t日志_${logName}_时长`, testFormatted);

    // 重新获取值
    const [newMsVal, newMsSuccess] = seal.vars.intGet(
      ctx,
      `$t日志_${logName}_时长_毫秒`
    );
    const [newStrVal, newStrSuccess] = seal.vars.strGet(
      ctx,
      `$t日志_${logName}_时长`
    );

    // 报告结果
    seal.replyToSender(
      ctx,
      msg,
      `日志「${logName}」时间变量测试:\n` +
        `原始值: ${msVal}毫秒(成功=${msSuccess}), ${strVal}(成功=${strSuccess})\n` +
        `测试值: ${testTime}毫秒, ${testFormatted}\n` +
        `新值: ${newMsVal}毫秒(成功=${newMsSuccess}), ${newStrVal}(成功=${newStrSuccess})`
    );

    return seal.ext.newCmdExecuteResult(true);
  };
  ext.cmdMap['logtime'] = cmdTest;

  // 监听消息接收事件
  ext.onCommandReceived = (ctx, msg, cmdArgs) => {
    // 检查是否为日志相关命令
    if (!cmdArgs.command) return;

    const cmd = cmdArgs.command.toLowerCase();
    if (cmd !== 'log' && cmd !== 'stat') return;

    // 获取操作类型
    const action = cmdArgs.getArgN(1)?.toLowerCase();
    if (!action) return;

    // 如果当前群组没有日志，则不处理
    if (!ctx.group) return;

    const groupId = ctx.group.groupId;
    let logName = '';

    // 根据不同命令执行不同操作
    switch (action) {
      case 'new':
        // .log new <日志名>
        logName = cmdArgs.getArgN(2);
        if (logName) {
          // 保存当前群组正在使用的日志名称
          currentLogs.set(groupId, logName);
          startTimer(groupId, logName);

          // 初始化变量
          saveTimeAsVariable(ctx, logName, 0, '0秒');

          // 提示变量使用方法
          seal.replyToSender(
            ctx,
            msg,
            `已开始记录日志「${logName}」，可使用变量 $t日志_${logName}_时长 获取时间`
          );
        }
        break;

      case 'on':
        // .log on [<日志名>]
        logName = cmdArgs.getArgN(2);
        if (!logName) {
          // 尝试从存储的Map中获取当前日志名
          logName = currentLogs.get(groupId) || '';
          if (!logName) {
            // 如果没有找到日志名，可能是通过UI或其他方式设置的
            // 这种情况下无法跟踪
            return;
          }
        } else {
          // 有指定日志名，更新当前群组使用的日志
          currentLogs.set(groupId, logName);
        }
        startTimer(groupId, logName);

        // 提示变量使用方法
        seal.replyToSender(
          ctx,
          msg,
          `已开始记录日志「${logName}」，可使用变量 $t日志_${logName}_时长 获取时间`
        );
        break;

      case 'off':
        // .log off
        // 从存储的Map中获取当前日志名
        logName = currentLogs.get(groupId) || '';
        if (logName) {
          pauseTimer(groupId, logName);

          // 获取计时结果并保存为变量
          const { totalTime } = getTimerResult(groupId, logName);
          const formattedTime = formatTime(totalTime);

          // 保存为变量
          saveTimeAsVariable(ctx, logName, totalTime, formattedTime);
        }
        break;

      case 'halt':
      case 'end':
        // .log halt / .log end
        // 从存储的Map中获取当前日志名
        logName = currentLogs.get(groupId) || '';
        if (logName) {
          const totalTime = endTimer(groupId, logName);
          const formattedTime = formatTime(totalTime);

          // 保存为变量
          saveTimeAsVariable(ctx, logName, totalTime, formattedTime);

          // 结束后清除当前日志名
          currentLogs.delete(groupId);
        }
        break;

      case 'stat':
        // .log stat [<日志名>]
        logName = cmdArgs.getArgN(2);
        if (!logName) {
          // 如果没有指定日志名，使用当前日志
          logName = currentLogs.get(groupId) || '';
          if (!logName) {
            // 如果没有找到日志名，不做处理
            return;
          }
        }

        if (logName) {
          const { totalTime, isRunning } = getTimerResult(groupId, logName);
          const formattedTime = formatTime(totalTime);

          // 保存为变量
          saveTimeAsVariable(ctx, logName, totalTime, formattedTime);
        }
        break;

      case 'list':
        // 在列出日志时，尝试获取所有日志名并存储起来
        // 这是为了解决无法直接获取当前日志名的问题
        // 注意：这种方法不是很可靠，因为我们无法知道哪个是当前日志
        break;
    }

    // 处理 .stat log 命令
    if (cmd === 'stat' && action === 'log') {
      // .stat log [<日志名>]
      logName = cmdArgs.getArgN(2);
      if (!logName) {
        // 如果没有指定日志名，使用当前日志
        logName = currentLogs.get(groupId) || '';
        if (!logName) {
          // 如果没有找到日志名，不做处理
          return;
        }
      }

      if (logName) {
        const { totalTime, isRunning } = getTimerResult(groupId, logName);
        const formattedTime = formatTime(totalTime);

        // 保存为变量
        saveTimeAsVariable(ctx, logName, totalTime, formattedTime);
      }
    }
  };

  // 监听所有消息，尝试从消息中提取当前日志信息
  ext.onMessageReceived = (ctx, msg) => {
    if (!ctx.group) return;
    const groupId = ctx.group.groupId;

    // 如果消息中包含"当前日志：XXX"或类似的字样，提取日志名并保存
    const message = msg.message;

    // 尝试匹配日志创建和开始的系统消息
    const newLogMatch = message.match(
      /成功创建并开始记录日志\s*[:：]\s*(.+?)\s*$/
    );
    const startLogMatch = message.match(/开始记录日志\s*[:：]\s*(.+?)\s*$/);

    if (newLogMatch && newLogMatch[1]) {
      const logName = newLogMatch[1].trim();
      currentLogs.set(groupId, logName);
      startTimer(groupId, logName);

      // 初始化变量
      saveTimeAsVariable(ctx, logName, 0, '0秒');
    } else if (startLogMatch && startLogMatch[1]) {
      const logName = startLogMatch[1].trim();
      currentLogs.set(groupId, logName);
      startTimer(groupId, logName);
    }
  };
}
