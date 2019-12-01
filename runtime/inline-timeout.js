function ApplyTimeoutManager(target) {
    const timeoutThreads = [];
    let timeoutHandle = 0;
    target.delay = duration => new Promise(
        resolve => target.setTimeout(resolve,duration)
    );
    target.setTimeout = (action,delay,...parameters) => {
        const thisHandle = timeoutHandle;
        timeoutHandle++;
        timeoutThreads.push({
            action: () => {
                action(...parameters);
            },
            endTime: performance.now() + delay,
            handle: thisHandle
        });
        return thisHandle;
    }
    target.clearTimeout = handle => {
        let i = 0;
        while(i<timeoutThreads.length) {
            const thread = timeoutThreads[i];
            if(thread.handle === handle) {
                timeoutThreads.splice(i,1);
                break;
            }
            i++;
        }
    }
    target.processThreads = timestamp => {
        let timeoutThreadIndex = 0;
        while(timeoutThreadIndex < timeoutThreads.length) {
            const timeoutThread = timeoutThreads[timeoutThreadIndex];
            if(timestamp >= timeoutThread.endTime) {
                timeoutThreads.splice(timeoutThreadIndex,1);
                timeoutThread.action();
                timeoutThreadIndex--;
            }
            timeoutThreadIndex++;
        }
    }
}
export default ApplyTimeoutManager;
