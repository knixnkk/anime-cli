# Anime Scraping CLI

A command-line application that automates browsing and watching anime from [Anifume.com](https://anifume.com). Built using Node.js, Puppeteer for web scraping, and Inquirer for interactive user input, this script allows users to easily search, select, and watch their favorite anime episodes while keeping track of their last watched episode.

## Features

- **Configuration Management**: Automatically saves the last watched anime title, episode, and URL in a `config.json` file for easy resuming.
- **Anime Browsing**: Navigate through anime titles and pages with a user-friendly prompt.
- **Episode Selection**: View and select from available episodes of the chosen anime.
- **Video Playback**: Plays selected episodes using the MPV media player in fullscreen mode.
- **Error Handling**: Gracefully handles errors during data retrieval and playback.

## Requirements

- [Node.js](https://nodejs.org/) (version 12 or higher)
- [MPV Player](https://mpv.io/)
- Required npm packages

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/knixnkk/anime-cli.git
   cd anime-cli
   ```
2. **Install dependencies**:

   ```bash
   npm install puppeteer inquirer
   ```
3. **Install MPV Player**: Follow the installation instructions for your operating system from the [`MPV website`](https://mpv.io/)

## Usage
1. **Run the script**:

```bash
node index.js
```
2. **Follow the prompts** to browse anime titles, search for specific shows, and select episodes to watch.
3. The last watched anime and episode will be saved in config.json, allowing you to resume your viewing experience easily.

## Configuration
The configuration file `config.json` will be automatically created upon first run. It includes fields for:

- `LAST_TITLE`: The title of the last watched anime.
* `LAST_EPISODE`: The title of the last watched episode.
+ `LAST_URL`: The URL of the last watched anime.

## Acknowledgements
- [`Puppeteer`](https://github.com/puppeteer/puppeteer) for browser automation.
+ [`Inquirer`](https://github.com/SBoudrias/Inquirer.js) for creating interactive command-line prompts.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request if you have suggestions or improvements.
