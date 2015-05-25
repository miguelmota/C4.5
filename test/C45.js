var fs = require('fs');
var test = require('tape');
var csv = require('csv');
var C45 = require('../C45');

function isNumeric(n) {
  return !isNaN(n);
}

test('tennis', function (t) {
  t.plan(7);

  function testCSV(filename, callback) {
    function fileLoaded(err, data) {
      if (err) {
        console.error(err);
      } else {
        csv.parse(data, parseCSV);
      }
    }

    function parseCSV(err, data) {
      var headers = data[0];
      var features = headers.slice(1,-1);
      var target = headers[headers.length-1];

      var trainingData = data.slice(1).map(function(d) {
        return d.slice(1);
      });

      var featureTypes = trainingData[0].map(function(d) {
        return isNumeric(d) ? 'number' : 'category';
      });

      train(trainingData, target, features, featureTypes);
    }

    function train(trainingData, target, features, featureTypes) {
      var c45 = C45();

      c45.train({
          data: trainingData,
          target: target,
          features: features,
          featureTypes: featureTypes
        }, function(error, model) {
        if (error) {
          console.error(error);
        } else {
          callback(function(testData, targets) {
            targets.forEach(function(target, i) {
              t.equal(model.classify(testData[i]), target);
            });
          }, model);
        }
      });
    }

    fs.readFile(filename, fileLoaded);
  }

  testCSV(__dirname + '/data/tennis.csv', function(classifyTest) {
    var testData = [
      ['Overcast', 'Mild', 'High', 'Strong'],
      ['Rain', 'Mild', 'High', 'Strong'],
      ['Sunny', 'Cool', 'Normal', 'Weak'],
    ];
    var targets = ['Yes','No','Yes'];

    classifyTest(testData, targets);
  });

  testCSV(__dirname + '/data/tic-tac-toe.csv', function(classifyTest) {
    var testData = [
      ['x','x','x','o','o','x','o','o'],
      ['o','x','o','x','x','o','x','o','x'],
    ];
    var targets = ['positive', 'negative'];

    classifyTest(testData, targets);
  });

  testCSV(__dirname + '/data/data.csv', function(classifyTest, model) {
    var testData = [
      ['B',71,'False'],
      ['C',70,'True'],
    ];
    var targets = ['CLASS1','CLASS2'];

    classifyTest(testData, targets);
  });
});
