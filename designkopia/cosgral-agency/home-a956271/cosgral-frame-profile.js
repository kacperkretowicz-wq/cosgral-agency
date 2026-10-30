/** Opt-in local profiling: no timers or observers during ordinary visits. */
export function createFrameProfile(canvas) {
  if (!new URLSearchParams(location.search).has('profile')) return null;
  const intervals = [], submissions = [];
  const motionIntervals = [], motionCosts = [];
  let previousMotion = 0, wasMoving = false, nextMotionReport = 0;
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
    activity(moving) {if(!moving){wasMoving=false;previousMotion=0;}},
    render(ms, now, moving = false, qualityTier = 0) {
      if (performance.now()-start<2500) return;
      if (!completed) submissions.push(ms);
      if (moving && wasMoving && previousMotion && now-previousMotion<200) {
        motionIntervals.push(now-previousMotion);motionCosts.push(ms);
        if(motionIntervals.length>240){motionIntervals.shift();motionCosts.shift();}
      }
      previousMotion=now;wasMoving=moving;
      if(!moving||motionIntervals.length<20||now<nextMotionReport)return;
      nextMotionReport=now+250;
      const ordered=motionIntervals.slice().sort((a,b)=>a-b);
      const average=motionIntervals.reduce((a,b)=>a+b,0)/motionIntervals.length;
      canvas.dataset.motionProfile=JSON.stringify({
        samples:motionIntervals.length,qualityTier,fps:+(1000/average).toFixed(1),
        p95FrameMs:+ordered[Math.floor(ordered.length*.95)].toFixed(2),
        slowFrames:motionIntervals.filter(ms=>ms>25).length,
        cpuRenderMs:+(motionCosts.reduce((a,b)=>a+b,0)/motionCosts.length).toFixed(2)
      });
    }
  };
}
