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
 * 在 .log off 时暂停计时并显示计时结果
 * 在 .log halt / .log end 时结束计时并显示计时结果
 * 在 .log stat / .stat log 时呈现计时结果
 */
export function registerLogTimer() {
  // 注册扩展
  let ext = seal.ext.find('log-timer');
  if (!ext) {
    ext = seal.ext.new('log-timer', 'Conatsu', '1.0.0');
    seal.ext.register(ext);
  }

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
          startTimer(groupId, logName);
        }
        break;

      case 'on':
        // .log on [<日志名>]
        logName = cmdArgs.getArgN(2);
        if (!logName) {
          // 如果没有指定日志名，使用当前日志
          // 这里需要获取当前日志名，但API可能不直接提供
          // 暂时略过这种情况
        } else {
          startTimer(groupId, logName);
        }
        break;

      case 'off':
        // .log off
        // 获取当前日志名（可能需要其他方式获取）
        logName = ctx.chBindCurGet?.() || ''; // 这是一个猜测的API，实际可能不存在或不同
        if (logName) {
          pauseTimer(groupId, logName);

          // 显示计时结果
          const { totalTime } = getTimerResult(groupId, logName);
          const formattedTime = formatTime(totalTime);

          // 暂停后发送当前计时结果
          setTimeout(() => {
            seal.replyToSender(
              ctx,
              msg,
              `日志「${logName}」已暂停，当前时长：${formattedTime}`
            );
          }, 500); // 延迟发送，避免干扰原有信息
        }
        break;

      case 'halt':
      case 'end':
        // .log halt / .log end
        logName = ctx.chBindCurGet?.() || ''; // 同上
        if (logName) {
          const totalTime = endTimer(groupId, logName);
          const formattedTime = formatTime(totalTime);

          // 结束后发送最终计时结果
          setTimeout(() => {
            seal.replyToSender(
              ctx,
              msg,
              `日志「${logName}」已结束，总时长：${formattedTime}`
            );
          }, 500); // 延迟发送，避免干扰原有信息
        }
        break;

      case 'stat':
        // .log stat [<日志名>]
        logName = cmdArgs.getArgN(2);
        if (!logName) {
          // 如果没有指定日志名，使用当前日志
          logName = ctx.chBindCurGet?.() || ''; // 同上
        }

        if (logName) {
          const { totalTime, isRunning } = getTimerResult(groupId, logName);
          const formattedTime = formatTime(totalTime);
          const statusText = isRunning ? '（计时中）' : '（已停止）';

          // 向用户发送计时结果
          setTimeout(() => {
            seal.replyToSender(
              ctx,
              msg,
              `日志「${logName}」的总时长：${formattedTime} ${statusText}`
            );
          }, 500); // 延迟发送，避免干扰原有统计信息
        }
        break;
    }

    // 处理 .stat log 命令
    if (cmd === 'stat' && action === 'log') {
      // .stat log [<日志名>]
      logName = cmdArgs.getArgN(2);
      if (!logName) {
        // 如果没有指定日志名，使用当前日志
        logName = ctx.chBindCurGet?.() || ''; // 同上
      }

      if (logName) {
        const { totalTime, isRunning } = getTimerResult(groupId, logName);
        const formattedTime = formatTime(totalTime);
        const statusText = isRunning ? '（计时中）' : '（已停止）';

        // 向用户发送计时结果
        setTimeout(() => {
          seal.replyToSender(
            ctx,
            msg,
            `日志「${logName}」的总时长：${formattedTime} ${statusText}`
          );
        }, 500); // 延迟发送，避免干扰原有统计信息
      }
    }
  };
}
