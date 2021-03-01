# invoice-hunter
CLI tool to crawl and download utility invoices and then upload to the google drive folder.


## Usage
```sh
$ npm i && npm run build

# copy and edit the config
$ cp ./.example-config.yml ~/invoice-hunter-config.yml

# pass the config
$ bin/invoice-hunter --config ~/invoice-hunter-config.yml

# or the shorthand
$ bin/invoice-hunter -c ~/invoice-hunter-config.yml
```
