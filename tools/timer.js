var timer = function timer(name) {
  var start = new Date().getTime();
  return {
    stop: function() {
      var end  = new Date().getTime();
      var time = end - start;
      var ms = time % 1000;
      var _sec = Math.floor(time / 1000);
      var sec = _sec % 60;
      var _min = Math.floor(_sec / 60);
      var min = _min % 60;
      var hr = Math.floor(_min / 60);
      var fmtTime = hr + ':' + min + ':' + sec + '.' + ms
      console.log('Timer:', name, 'finished in', fmtTime);
    },

    mark: function(title) {
      var now = new Date();
      var time = now.getTime() - start;
      console.log('Mark:', name, title, 'at', time, 'ms');
    }
  };
};

module.exports = timer;
