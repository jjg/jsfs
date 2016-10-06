var timer = function timer(name) {
  var start = new Date().getTime();
  return {
    stop: function() {
      var end  = new Date();
      var time = end.getTime() - start;
      console.log('Timer:', name, 'finished in', time, 'ms');
    },

    mark: function(title) {
      var now = new Date();
      var time = now.getTime() - start;
      console.log('Mark:', name, title, 'at', time, 'ms');
    }
  };
};

module.exports = timer;
