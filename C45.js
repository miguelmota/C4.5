(function(root) {
  'use strict';

  function unique(col) {
    var u = {}, a = [];
    for(var i = 0, l = col.length; i < l; ++i){
      if(u.hasOwnProperty(col[i])) {
        continue;
      }
      a.push(col[i]);
      u[col[i]] = 1;
    }
    return a;
  }

  function find(col, pred) {
    var value;
    col.forEach(function(item) {
      var result = pred(item);
      if (result) {
        value = item;
      }
    });
    return value;
  }

  function max(array, fn) {
    var max = -Infinity;
    var index;
    for (var i = 0; i < array.length; i++) {
      var result = fn(array[i]);
      if (result >= max) {
        max = result;
        index = i;
      }
    }
    return typeof index !== 'undefined' ? array[index] : max;
  }

  function sortBy(col, fn) {
   col = [].slice.call(col);
   return col.sort(fn);
  }

  function C45() {
    if (!(this instanceof C45)) {
      return new C45();
    }
    this.features = [];
    this.targets = [];
    this.model = {}
    this.target = ''
  }

  C45.prototype = {
    /**
     * train
     *
     * @param {object} options
     * @param {array} options.data - training data
     * @param {string} options.target - class label
     * @param {array} options.features - features names
     * @param {array} options.featureTypes - features type (ie 'category', 'number')
     * @param {function} callback - callback, containing error and model as parameters
     */
    train: function(options, callback) {
      var data = options.data;
      var target = options.target;
      var features = options.features;
      var featureTypes = options.featureTypes;

      featureTypes.forEach(function(f) {
        if (['number','category'].indexOf(f) === -1) {
          callback(new Error('Unrecognized feature type'));
          return;
        }
      });

      var targets = unique(data.map(function(d) {
        return d[d.length-1];
      }));
      this.features = features;
      this.targets = targets;
      this.target = target

      var classify = this.classify.bind(this)

      var model = {
        features: this.features,
        targets: this.targets,

        // model is the generated tree structure
        model: this._c45(data, target, features, featureTypes, 0),

        classify: function (sample) {
          return classify(this.model, sample)
        },

        toJSON: function() {
          return JSON.stringify(this.model)
        }
      };

      this.model = model.model

      callback(null, model);
    },

    getModel: function() {
      var classify = this.classify.bind(this)
      var model = this.model

      return {
        features: this.features,
        targets: this.targets,
        classify: function (sample) {
          return classify(model, sample)
        },
        toJSON: function() {
          return JSON.stringify(this.model)
        }
      }
    },

    _c45: function(data, target, features, featureTypes, depth) {
      var targets = unique(data.map(function(d) {
        return d[d.length-1];
      }));

      if (!targets.length) {
        return {
          type: 'result',
          value: 'none data',
          name: 'none data'
        };
      }

      if (targets.length === 1) {
        return {
          type: 'result',
          value: targets[0],
          name: targets[0]
        };
      }

      if (!features.length) {
        var topTarget = this.mostCommon(targets);
        return {
          type: 'result',
          value: topTarget,
          name: topTarget
        };
      }

      var bestFeatureData = this.maxGain(data, target, features, featureTypes);
      var bestFeature = bestFeatureData.feature;

      var remainingFeatures = features.slice(0);
      remainingFeatures.splice(features.indexOf(bestFeature), 1);

      if (featureTypes[this.features.indexOf(bestFeature)] === 'category') {
        var possibleValues = unique(data.map(function(d) {
          return d[this.features.indexOf(bestFeature)];
        }.bind(this)));
        var node = {
          name: bestFeature,
          type: 'feature_category',
          values: possibleValues.map(function(v) {
            var newData = data.filter(function(x) {
              return x[this.features.indexOf(bestFeature)] === v;
            }.bind(this));
            var childNode = {
              name: v,
              type: 'feature_value',
              child: this._c45(newData, target, remainingFeatures, featureTypes, depth+1)
            };
            return childNode;
          }.bind(this))
        };
      } else if (featureTypes[this.features.indexOf(bestFeature)] === 'number') {
        var possibleValues = unique(data.map(function(d) {
          return d[this.features.indexOf(bestFeature)];
        }.bind(this)));
        var node = {
          name: bestFeature,
          type: 'feature_number',
          cut: bestFeatureData.cut,
          values: []
        };

        var newDataRight = data.filter(function(x) {
          return parseFloat(x[this.features.indexOf(bestFeature)]) > bestFeatureData.cut;
        }.bind(this));
        var childNodeRight = {
          name: bestFeatureData.cut.toString(),
          type: 'feature_value',
          child: this._c45(newDataRight, target, remainingFeatures, featureTypes, depth+1)
        };
        node.values.push(childNodeRight);

        var newDataLeft = data.filter(function(x) {
          return parseFloat(x[this.features.indexOf(bestFeature)]) <= bestFeatureData.cut;
        }.bind(this));
        var childNodeLeft = {
          name: bestFeatureData.cut.toString(),
          type: 'feature_value',
          child: this._c45(newDataLeft, target, remainingFeatures, featureTypes, depth+1),
        };
        node.values.push(childNodeLeft);
      }
      return node;
    },

    maxGain: function(data, target, features, featureTypes) {
      var g45 = features.map(function(feature) {
        return this.gain(data, target, features, feature, featureTypes);
      }.bind(this));
      return max(g45, function(e) {
        return e.gain;
      });
    },

    gain: function(data, target, features, feature, featureTypes) {
      var setEntropy = this.entropy(data.map(function(d) {
        return d[d.length-1];
      }));
      if (featureTypes[this.features.indexOf(feature)] === 'category') {
        var attrVals = unique(data.map(function(d) {
          return d[this.features.indexOf(feature)];
        }.bind(this)));
        var setSize = data.length;
        var entropies = attrVals.map(function(n) {
          var subset = data.filter(function(x) {
            return x[feature] === n;
          });
          return (subset.length/setSize) * this.entropy(
            subset.map(function(d) {
              return d[d.length-1];
            })
          );
        }.bind(this));
        var sumOfEntropies = entropies.reduce(function(a, b) {
          return a + b;
        }, 0);
        return {
          feature: feature,
          gain: setEntropy - sumOfEntropies,
          cut: 0
        };
      } else if (featureTypes[this.features.indexOf(feature)] === 'number') {
        var attrVals = unique(data.map(function(d) {
          return d[this.features.indexOf(feature)];
        }.bind(this)));
        var gainVals = attrVals.map(function(cut) {
          var cutf = parseFloat(cut);
          var gain = setEntropy - this.conditionalEntropy(data, feature, cutf, target);
          return {
              feature: feature,
              gain: gain,
              cut: cutf
          };
        }.bind(this));
        var maxgain = max(gainVals, function(e) {
          return e.gain;
        });
        return maxgain;
      }
    },

    entropy: function(vals) {
      var uniqueVals = unique(vals);
      var probs = uniqueVals.map(function(x) {
        return this.prob(x, vals);
      }.bind(this));
      var logVals = probs.map(function(p) {
        return -p * this.log2(p);
      }.bind(this));
      return logVals.reduce(function(a, b) {
        return a + b;
      }, 0);
    },

    conditionalEntropy: function(data, feature, cut, target) {
      var subset1 = data.filter(function(x) {
        return parseFloat(x[this.features.indexOf(feature)]) <= cut;
      }.bind(this));
      var subset2 = data.filter(function(x) {
        return parseFloat(x[this.features.indexOf(feature)]) > cut;
      }.bind(this));
      var setSize = data.length;
      return subset1.length/setSize * this.entropy(
        subset1.map(function(d) {
          return d[d.length-1];
        })
      ) + subset2.length/setSize*this.entropy(
        subset2.map(function(d) {
          return d[d.length-1];
        })
      );
    },

    prob: function(target, targets) {
      return this.count(target,targets)/targets.length;
    },

    mostCommon: function(targets) {
      return sortBy(targets, function(target) {
        return this.count(target, targets);
      }.bind(this)).reverse()[0];
    },

    count: function(target, targets) {
      return targets.filter(function(t) {
        return t === target;
      }).length;
    },

    log2: function(n) {
      return Math.log(n) / Math.log(2);
    },

    toJSON: function() {
      return JSON.stringify({
        features: this.features,
        targets: this.targets,
        target: this.target,
        model: this.model,
      })
    },

    classify: function classify(model, sample) {
      // root is feature (attribute) containing all sub values
      var root = model;

      if (typeof root === 'undefined') {
        throw new Error('model is undefined')
      }

      while (root.type !== 'result') {
        var childNode;

        if (root.type === 'feature_number') {
          var featureName = root.name;
          var sampleVal = parseFloat(sample[featureName]);

          if (sampleVal <= root.cut) {
            childNode = root.values[1];
          } else {
            childNode = root.values[0];
          }
        } else {
          // feature syn attribute
          var feature = root.name;
          var sampleValue = sample[this.features.indexOf(feature)];

          // sub value , containing 2 childs
          childNode = find(root.values, function(x) {
            return x.name === sampleValue;
          });
        }

        // non trained feature
        if (typeof childNode === 'undefined') {
          return 'unknown';
        }
        root = childNode.child;
      }
      return root.value;
    },

    restore: function(options) {
      this.features = options.features || []
      this.targets = options.targets || ''
      this.target = options.target || ''
      this.model = options.model || {}
    }
  };

  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = C45;
    }
    exports.C45 = C45;
  } else if (typeof define === 'function' && define.amd) {
    define([], function() {
      return C45;
    });
  } else {
    root.C45 = C45;
  }

})(this);
