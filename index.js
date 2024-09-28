const puppeteer = require('puppeteer');
const inquirer = require('inquirer');
const { spawn } = require('child_process');
const fs = require('fs');

const red = '\x1b[31m';
const green = '\x1b[32m';
const blue = '\x1b[34m';
const reset = '\x1b[0m';

const path = require('path');

const configPath = path.join(__dirname, 'config.json');

function readConfig() {
    return new Promise((resolve, reject) => {
        fs.readFile(configPath, 'utf8', (err, data) => {
            if (err) {
                return reject(err);
            }
            resolve(JSON.parse(data));
        });
    });
}

function writeConfig(config) {
    return new Promise((resolve, reject) => {
        fs.writeFile(configPath, JSON.stringify(config, null, 4), 'utf8', (err) => {
            if (err) {
                return reject(err);
            }
            //console.log('Config updated:', config);
            resolve();
        });
    });
}

async function updateConfig(key, value) {
    try {
        const config = await readConfig();
        config[key] = value; 
        await writeConfig(config);
    } catch (error) {
        console.error('Error updating config:', error);
    }
}




async function loadIndex(pageCount, page) {
    await page.goto(`https://anifume.com/page/${pageCount}`);

    let animeData = await page.evaluate(() => {
        const titles = Array.from(document.querySelectorAll('.col-title a'));
        return titles.map((title) => ({
            title: title.textContent.trim(),
            url: title.href
        }));
    });

    const search = { title: 'Search', url: '' };
    const nextPage = { title: 'Next Page', url: '' };
    const exit = { title: 'Exit', url: '' };

    animeData.unshift(search);
    animeData.push(nextPage);
    animeData.push(exit);

    const choices = animeData.map(anime => anime.title);
    const lastIndex = choices.length - 1; 

    const prompt = inquirer.createPromptModule();
    const answers = await prompt([{
        type: 'list',
        name: 'selectedAnime',
        message: 'Select an anime you would like to watch (or exit):',
        choices, 
        pageSize: 16,
        loop: false
    }]);

    const selectedIndex = choices.indexOf(answers.selectedAnime);
    return { lastIndex, selectedIndex, animeData };
}
async function mainLoop(pageCount = 1) {
    const browser = await puppeteer.launch();
    const prompt = inquirer.createPromptModule();

    while (true) {
        const config = await readConfig();
        console.warn(`Last watched anime was: ${config.LAST_TITLE} - Episode: ${config.LAST_EPISODE}`);
        const page = await browser.newPage();
        const { lastIndex, selectedIndex, animeData } = await loadIndex(pageCount, page);
        
        if (selectedIndex === lastIndex - 1) {
            pageCount += 1;
            console.warn('Next Page: Fetching next page of anime...');
            await page.close();
            continue;
        } else if (selectedIndex === lastIndex) {
            console.error('Exiting the application.');
            await browser.close();
            process.exit(0); 
        } else if (selectedIndex === 0) {
            const searchAnswer = await prompt([{
                type: 'input',
                name: 'searchTerm',
                message: 'Enter a part of name to search : '
            }]);
            await page.goto(`https://anifume.com/search/${searchAnswer.searchTerm}`);

            try {
                let animeData = await page.evaluate(() => {
                    const titles = Array.from(document.querySelectorAll('.col-title a'));
                    return titles.map((title) => ({
                        title: title.textContent.trim(),
                        url: title.href
                    }));
                });
                const backs = { title: 'Back', url: '' };

                animeData.push(backs);

                const choices = animeData.map(anime => anime.title);
                const lastIndexs = choices.length - 1; 

                const prompt = inquirer.createPromptModule();
                const answers = await prompt([{
                    type: 'list',
                    name: 'selectedAnime',
                    message: 'Select an anime you would like to watch (or exit):',
                    choices, 
                    pageSize: 16,
                    loop: false
                }]);

                const selectedIndex = choices.indexOf(answers.selectedAnime);
                await page.goto(`${animeData[selectedIndex].url}`, { waitUntil: 'networkidle2' });

                const episodes = await page.evaluate(() => {
                    const episodeElements = Array.from(document.querySelectorAll('.eplink a'));
                    return episodeElements.map(el => {
                        const title = el.textContent.trim();
                        const episodeMatch = title.match(/ตอนที่ (\d+)/);
                        const episodeNumber = episodeMatch ? `Episode ${episodeMatch[1]}` : title;
                        return {
                            title: episodeNumber,
                            url: el.href
                        };
                    });
                });
                const back = { title: 'Back', url: '' };
                episodes.push(back);

                const epChoices = episodes.map(anime => anime.title);
                const epAnswers = await prompt([{
                    type: 'list',
                    name: 'selectedEpisode',
                    message: 'Select an Episode:',
                    choices: epChoices,
                    pageSize: 16,
                    loop: false
                }]);

                const epSelectedIndex = epChoices.indexOf(epAnswers.selectedEpisode);

                const lastIndex = epChoices.length - 1;
                if(lastIndex === epSelectedIndex){
                    console.warn('Going back');
                }else{
                    await page.goto(`${episodes[epSelectedIndex].url}`, { waitUntil: 'networkidle2' });

                    const iframeSrc = await page.$eval('#vpfi iframe', el => el.src);
                    const iframePage = await browser.newPage();
                    await iframePage.goto(iframeSrc, { waitUntil: 'networkidle2' });
                    const iframeContent = await iframePage.content();
                    await iframePage.waitForSelector('script');

                    const videoUrls = [];
                    const urlMatches = iframeContent.match(/"file":\s?"(https?:\/\/[^"]+)"/g);

                    if (urlMatches) {
                        urlMatches.forEach(match => {
                            const url = match.match(/"(https?:\/\/[^"]+)"/)[1];
                            videoUrls.push(url);
                        });
                    } else {
                        console.error('Video URLs not found in script content.');
                    }

                    await iframePage.close();

                    if (videoUrls.length > 0) {
                        const mpv = spawn('mpv', ['--fullscreen', videoUrls[0]]);
                        mpv.on('exit', () => {
                            console.warn('Playback finished. Returning to main menu.');
                        });
                    }
                }
            } catch (error) {
                console.error('Error fetching anime data:', error);
            }
            
        } else {
            await page.goto(`${animeData[selectedIndex].url}`, { waitUntil: 'networkidle2' });

            const episodes = await page.evaluate(() => {
                const episodeElements = Array.from(document.querySelectorAll('.eplink a'));
                return episodeElements.map(el => {
                    const title = el.textContent.trim();
                    const episodeMatch = title.match(/ตอนที่ (\d+)/);
                    const episodeNumber = episodeMatch ? `Episode ${episodeMatch[1]}` : title;
                    return {
                        title: episodeNumber,
                        url: el.href
                    };
                });
            });
            const back = { title: 'Back', url: '' };
            episodes.push(back);

            const epChoices = episodes.map(anime => anime.title);
            const epAnswers = await prompt([{
                type: 'list',
                name: 'selectedEpisode',
                message: 'Select an Episode:',
                choices: epChoices,
                pageSize: 16,
                loop: false
            }]);

            const epSelectedIndex = epChoices.indexOf(epAnswers.selectedEpisode);

            const lastIndex = epChoices.length - 1;
            if (lastIndex === epSelectedIndex) {
                console.warn('Going back');
            } else {
                await page.goto(`${episodes[epSelectedIndex].url}`, { waitUntil: 'networkidle2' });
                const iframeSrc = await page.$eval('#vpfi iframe', el => el.src);
                const iframePage = await browser.newPage();
                await iframePage.goto(iframeSrc, { waitUntil: 'networkidle2' });
                const iframeContent = await iframePage.content();
                await iframePage.waitForSelector('script');
            
                const videoUrls = [];
                const urlMatches = iframeContent.match(/"file":\s?"(https?:\/\/[^"]+)"/g);
            
                if (urlMatches) {
                    urlMatches.forEach(match => {
                        const url = match.match(/"(https?:\/\/[^"]+)"/)[1];
                        videoUrls.push(url);
                    });
                } else {
                    console.error('\nVideo URLs not found in script content.');
                }
            
                await iframePage.close();
            
                if (videoUrls.length > 0) {
                    await page.goto(animeData[selectedIndex].url)
                    const animeTitle = await page.evaluate(() => {
                        const titleElement = document.querySelector('body > div.wrapper > div > div.content-row > div.content-des > div > a:nth-child(1)').text;
                        return titleElement;
                    });
                    //body > div.wrapper > div > div.content-row > div.content-des > div > a:nth-child(1) -> get this element text
                    console.log(animeTitle);
                    await updateConfig('LAST_TITLE', animeTitle);
                    await updateConfig('LAST_EPISODE', episodes[epSelectedIndex].title);
                    await updateConfig('LAST_URL', animeData[selectedIndex].url);
                    const mpv = spawn('mpv', ['--fullscreen', videoUrls[0]]);
                    mpv.on('exit', () => {
                        console.warn('\nPlayback finished. Returning to main menu.');
                    });
                }
            }
        }

        await page.close(); 
        console.clear(); 
    }
}

mainLoop().catch(error => {
    console.error('An error occurred:', error);
});
