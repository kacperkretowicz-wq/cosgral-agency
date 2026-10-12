/** Opt-in local profiling: no timers or observers during ordinary visits. */
export function createFrameProfile(canvas) {
  if (!new URLSearchParams(location.search).has('profile')) return null;
  const intervals = [], submissions = [];
  let start = 0, previous = 0, longTasks = 0, longestTask = 0, completed = false;
  let observer;
  let events;
  try {
    observer = new PerformanceObserver(list => {
      for (const item of list.getEntries()) {
        longTasks++; longestTask = Math.max(longestTask, item.duration);
      }
    });
    observer.observe({type:'longtask', buffered:false});
  } catch (_) {}
  try {
    const latencies = [];
    events = new PerformanceObserver(list => {
      for (const item of list.getEntries()) if (item.name === 'click' || item.name === 'keydown') latencies.push(item.duration);
      canvas.dataset.inputProfile = JSON.stringify({samples:latencies.length,maxMs:Math.max(0,...latencies)});
    });
    events.observe({type:'event',buffered:false,durationThreshold:16});
    window.addEventListener('pagehide',()=>events.disconnect(),{once:true});
  } catch (_) {}
  canvas.dataset.profile = 'warming';
  function finish() {
    completed = true;
    observer?.disconnect();
    const sorted = intervals.slice().sort((a,b) => a-b);
    const sum = intervals.reduce((a,b) => a+b,0);
    canvas.dataset.profile = JSON.stringify({
      samples:intervals.length,
      averageFrameMs:+(sum/intervals.length).toFixed(2),
      p95FrameMs:+sorted[Math.floor(sorted.length*0.95)].toFixed(2),
      slowFrames:intervals.filter(ms => ms>25).length,
      cpuRenderMs:+(submissions.reduce((a,b) => a+b,0)/Math.max(1,submissions.length)).toFixed(2),
      longTasks,longestTaskMs:+longestTask.toFixed(2),
      buffer:[canvas.width,canvas.height]
    });
  }
  return {
    frame(now) {
      if (completed) return;
      if (!start) start=now;
      // Exclude model/shader initialization and the arrival animation.
      if (now-start<2500) {previous=now;return;}
      const dt=now-previous;previous=now;
      if (dt>0 && dt<250) intervals.push(dt);
      if (intervals.length>=180) finish();
    },
    render(ms) {if (!completed && performance.now()-start>2500) submissions.push(ms);}
  };
}
