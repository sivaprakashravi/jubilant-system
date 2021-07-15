const puppeteer = require('puppeteer');
const config = require('./config')
const fs = require('fs')

const jQ = "./libs/jquery-3.5.1.slim.min.js";
const start = async () => {
  const browser = await puppeteer.launch({
    headless: false
  })
  const page = await browser.newPage()
  const userAgent = 'Mozilla/5.0 (X11; Linux x86_64)' +
    'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.39 Safari/537.36';
  await page.setUserAgent(userAgent);
  await page.setViewport({ width: 1280, height: 1768 });
  await page.goto('http://web.whatsapp.com')
  await page.waitForSelector('.zaKsw', { timeout: 60000 })
  console.log('logged in')

  let contactlist = getContact(config.contact)
  contactlist = contactlist.split(/\r?\n/)

  for (const contact of contactlist) {
    const precontent = getContent(config.content)
    let content = encodeURI(precontent)
    await page.goto('https://web.whatsapp.com/send?phone=' + contact + '&text=' + content);
    await page.addScriptTag({ path: jQ });
    await page.on('dialog', async dialog => {
      await dialog.accept()
    })
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
  }
  debugger;
  console.log('done');
  setTimeout(() => {
    page.close();
  }, 5000);
}

start()

const getContact = (path) => {
  const contact = fs.readFileSync(path, { encoding: 'utf-8' })
  return contact;
}

const getContent = (path) => {
  const content = fs.readFileSync(path, { encoding: 'utf-8' })
  return content;
}
