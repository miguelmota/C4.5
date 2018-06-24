# C4.5

*Note: This is a fork of [learningjs](https://github.com/yandongliu/learningjs).*

> [C4.5](https://en.wikipedia.org/wiki/C4.5_algorithm) decision tree generation algorithm in JavaScript.

[![NPM](https://nodei.co/npm/c4.5.png)](https://nodei.co/npm/c4.5)

## Install

```bash
npm install c4.5
```

## Usage

`data.csv`

```csv
id,attr1,attr2,attr3,class
1,A,70,True,CLASS1
2,A,90,True,CLASS2
3,A,85,False,CLASS2
4,A,95,False,CLASS2
5,A,70,False,CLASS1
6,B,90,True,CLASS1
7,B,78,False,CLASS1
8,B,65,True,CLASS1
9,B,75,False,CLASS1
10,C,80,True,CLASS2
11,C,70,True,CLASS2
12,C,80,False,CLASS1
13,C,80,False,CLASS1
14,C,96,False,CLASS1
```

```js
var fs = require('fs');
var csv = require('csv');
var C45 = require('c4.5');

fs.readFile('data.csv', function(err, data) {
  if (err) {
    console.error(err);
    return false;
  }

  csv.parse(data, function(err, data) {
    if (err) {
      console.error(err);
      return false;
    }

    var headers = data[0];
    var features = headers.slice(1,-1); // ["attr1", "attr2", "attr3"]
    var featureTypes = ['category','number','category'];
    var trainingData = data.slice(1).map(function(d) {
      return d.slice(1);
    });
    var target = headers[headers.length-1]; // "class"
    var c45 = C45();

    c45.train({
        data: trainingData,
        target: target,
        features: features,
        featureTypes: featureTypes
    }, function(error, model) {
      if (error) {
        console.error(error);
        return false;
      }

      var testData = [
        ['B',71,'False'],
        ['C',70,'True'],
      ];

      console.log(model.classify(testData[0]) === 'CLASS1'); // true
      console.log(model.classify(testData[1]) === 'CLASS2'); // true
    });
  });
});
```

### Saving

```js
var c45 = C45();
c45.train({...})
fs.writeFileSync('state.json', c45.toJSON())
```

### Restoring

```js
var c45 = C45();
var state = require('state.json')
c45.restore(state)
var model = c45.getModel()
console.log(model.classify(testData[0])) // 'CLASS1'
```

## Test

```bash
npm test
```

## License

MIT
