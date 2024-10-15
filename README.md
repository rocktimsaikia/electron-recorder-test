# Desktop Recorder

Codingal's internal desktop app for teachers to record and upload screencasts.

## Development

> [!IMPORTANT]
> Starting the Electron development server might require changing the permissions of the `sandbox` bin in the `node_modules` to the `root` user. We can grant those permissions with the following commands below:

```sh
# Change the owner of the sandbox to `root`.
sudo chown root ./node_modules/electron/dist/chrome-sandbox

# Change the sandbox mode to 4755 (read, write, execute)
sudo chmod 4755 ./node_modules/electron/dist/chrome-sandbox
```

Start the dev server:

```sh
yarn start
```
