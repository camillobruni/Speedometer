(function () {
    const origSetTimeout = window.setTimeout;
    const origClearTimeout = window.clearTimeout;

    let pendingCallbacks = new Map(); // id -> { type: 'raf' | 'ric', callback, timerId }
    let nextId = 1;

    window.requestAnimationFrame = function (callback) {
        const id = nextId++;
        const timerId = origSetTimeout(function () {
            pendingCallbacks.delete(id);
            try {
                callback(performance.now());
            } catch (e) {
                console.error("Error in rAF callback:", e);
            }
        }, 0);
        pendingCallbacks.set(id, { type: 'raf', callback, timerId });
        return id;
    };

    window.cancelAnimationFrame = function (id) {
        if (pendingCallbacks.has(id)) {
            origClearTimeout(pendingCallbacks.get(id).timerId);
            pendingCallbacks.delete(id);
        }
    };

    window.requestIdleCallback = function (callback, options) {
        const id = nextId++;
        const timerId = origSetTimeout(function () {
            pendingCallbacks.delete(id);
            const start = performance.now();
            const deadline = {
                didTimeout: false,
                timeRemaining: function () {
                    return Math.max(0, 50 - (performance.now() - start));
                }
            };
            try {
                callback(deadline);
            } catch (e) {
                console.error("Error in rIC callback:", e);
            }
        }, 0);
        pendingCallbacks.set(id, { type: 'ric', callback, timerId });
        return id;
    };

    window.cancelIdleCallback = function (id) {
        if (pendingCallbacks.has(id)) {
            origClearTimeout(pendingCallbacks.get(id).timerId);
            pendingCallbacks.delete(id);
        }
    };

    window.__speedometer_flush_raf = function () {
        let iterations = 0;
        const maxIterations = 50;
        while (pendingCallbacks.size > 0 && iterations < maxIterations) {
            iterations++;
            const items = Array.from(pendingCallbacks.entries());
            for (const [id, item] of items) {
                if (pendingCallbacks.has(id)) {
                    origClearTimeout(item.timerId);
                    pendingCallbacks.delete(id);
                    try {
                        if (item.type === 'raf') {
                            item.callback(performance.now());
                        } else if (item.type === 'ric') {
                            const start = performance.now();
                            item.callback({
                                didTimeout: false,
                                timeRemaining: () => Math.max(0, 50 - (performance.now() - start))
                            });
                        }
                    } catch (e) {
                        console.error("Error in flush callback:", e);
                    }
                }
            }
        }
    };
})();
