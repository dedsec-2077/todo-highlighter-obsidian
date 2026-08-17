In order to use Hot-Reload plugin from Obsidian you just need to have activated from the community plugins and while you are in `npm run dev` mode any change in `src/` will rebuild in order to take effect.

In case of any problems with `npm run dev` you may need to delete `node_modules` and `package-lock.json` and then run again:
```bash
npm install
# also possibly some approvals around this part
npm run dev
```
