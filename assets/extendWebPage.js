;(function () {
    function urlMatch(pattern, url = location.href) {
        pattern = pattern.replace(/\*/g, '.*?');
        pattern = '^' + pattern + '$';
        const regex = new RegExp(pattern);
        return regex.test(url);
    }

    function saveTextToFile(text, fileName) {
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    function setClipboardText(text) {
        const input = document.createElement('input');
        input.value = text;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
    }

    function getDOM(selector = 'body', timeout = 3000) {
        return new Promise((resolve, reject) => {
            try {
                let timeBrack, timer;
                timer = setInterval(() => {
                    const el = $(selector);
                    if (el.length > 0) {
                        clearInterval(timer);
                        clearTimeout(timeBrack);
                        resolve(el);
                    }
                }, 50);
                timeBrack = setTimeout(() => {
                    clearInterval(timer);
                    clearTimeout(timeBrack);
                    reject(`'${selector}' DOM find not found`);
                }, timeout);
            } catch (err) {
                reject(err.message);
            }
        })
    }

    function applyExtendWebPage(routePattern, routeExec, target) {
        if (urlMatch(routePattern, location.href)) {
            let { __style__, __elements__, startExec, bodyExec, __exec__, loadExec, public } = routeExec();

            Object.assign(target, public);
            if (__style__ !== undefined) {
                $(document.head).append(__style__);
            }
            if (typeof startExec === 'function') {
                startExec.call(target, { style: __style__, elements: __elements__, useResInject: routeExec.require });
            }
            if (typeof bodyExec === 'function') {
                bodyExec = bodyExec.bind(target);
                $(document).one('DOMContentLoaded', () => {
                    bodyExec({ style: __style__, elements: __elements__, useResInject: routeExec.require });
                })
            }
            if (typeof __exec__ === 'function') {
                __exec__.call(target, { style: __style__, elements: __elements__, useResInject: routeExec.require })
            }
            if (typeof loadExec === 'function') {
                loadExec = loadExec.bind(target);
                $(window).one('load', () => {
                    loadExec({ style: __style__, elements: __elements__, useResInject: routeExec.require });
                })
            }
        }
    }

    function extendWebPage(routeExecs) {
        let target = {};
        for (let i = 0; i < routeExecs.length; i++) {
            const { routes } = routeExecs[i];

            for (let j = 0; j < routes.length; j++) {
                applyExtendWebPage(routes[j], routeExecs[i], target);
            }
        }
        return new Proxy(target, {
            get(target, key) {
                return target[key];
            },
            set(target, key, value) {
                target[key] = value;
            }
        })
    }

    jQuery.urlMatch = urlMatch;
    jQuery.saveTextToFile = saveTextToFile;
    jQuery.setClipboardText = setClipboardText;
    jQuery.getDOM = getDOM;

    window.extendWebPage = extendWebPage;
})();