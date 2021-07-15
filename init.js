const puppeteer = require('puppeteer');

const express = require('express');
const { jQ } = require('./constants/defaults');
const app = express();
var cors = require('cors');
const port = 3000;
const instances = {};

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));
app.get('/', (req, res) => {
    res.send('Hello World!')
});

app.get('/login', async (_req, res) => {
    const browser = await puppeteer.launch({
        headless: false
    });
    const page = await browser.newPage();
    const target = page._client._sessionId;
    instances[target] = page;
    const userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.39 Safari/537.36';
    await instances[target].setUserAgent(userAgent);
    await instances[target].setViewport({ width: 1280, height: 1768 });
    await instances[target].goto('http://web.whatsapp.com');
    await instances[target].waitForSelector('canvas');
    await instances[target].addScriptTag({ path: jQ });
    const barcode = await instances[target].evaluate(p => {
        return $('div[data-ref]').attr('data-ref');
    });
    res.send({ target, barcode });
});

const verifyPageConnection = async (target) => {
    let isConnected = 0;
    if (target) {
        await instances[target].waitForSelector('.zaKsw', { timeout: 60000 });
        isConnected = await instances[target].evaluate(p => {
            return $('.zaKsw div:contains("Keep your phone connected")').length;
        });
    }
    return isConnected ? true : false;
}

app.get('/verify/:target', async (req, res) => {
    const target = req.params.target;
    const isConnected = await verifyPageConnection(target);
    res.send({ isConnected });
});

app.post('/message/:target', async (req, res) => {
    const { message, contacts } = req.body;
    const target = req.params.target;
    const isConnected = await verifyPageConnection(target);
    if (contacts && contacts.length && isConnected) {
        const page = instances[target];
        contacts.forEach(async (contact) => {
            const content = encodeURI(message);
            await page.goto('https://web.whatsapp.com/send?phone=' + contact + '&text=' + content);
            await page.addScriptTag({ path: jQ });
            await page.on('dialog', async dialog => {
                await dialog.accept();
            });
            try {
                await page.waitForSelector('.copyable-text.selectable-text', { timeout: 10000 })
            } catch (error) {
                console.log('invalid phone number ' + contact + ' in line-' + eval(i + 1))
                return;
            }
            await page.waitForSelector('footer', { timeout: 10000 })
            const cName = await page.evaluate(() => {
                return $('footer button span[data-testid="send"]').parent().attr('class');
            });
            // await page.focus(`.${cName}`);
            await page.click(`.${cName}`);
        });
        res.send({message: "Success!"});
    } else {
        res.send({err: "Something Went Wrong!"});
    }
});

app.get('/logout/:target', async (req, res) => {
    const target = req.params.target;
    const page = instances[target];
    if(page) {        
        await page.waitForSelector('#side', { timeout: 60000 });
        await page.waitForSelector('div[aria-label="Menu"]', { timeout: 60000 });
        await page.click('div[aria-label="Menu"]');
        await page.waitForSelector('div[aria-label="Log out"]', { timeout: 60000 });
        await page.click('div[aria-label="Log out"]');
        res.send({message: "Logout Success!"});
    } else {
        res.send({err: "Page Instance Not available! Logout from mobile device"});
    }
    
})

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})