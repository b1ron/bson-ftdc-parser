Ignore invalid dates as we are likely not reading the buffer correctly.

```sh
node mime.js grep -E '20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z'
2021-03-15T02:21:48.000Z
2021-03-15T02:21:48.000Z
2021-03-15T02:21:48.000Z
2021-03-15T02:21:48.000Z
2021-03-15T02:21:48.000Z
```

#### TODO
1. Fix `indexBeforeColon`. We are most likely not reading the buffer correctly, _again_.
2. Extract field names (depends on 1).
3. Parse more BSON types which are defined in the `constants.js` file.
