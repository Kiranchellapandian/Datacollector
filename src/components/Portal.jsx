import React, { useState, useEffect, useRef } from 'react';
import './components/styles.css';
import axios from 'axios';

// Constants for normalization and threshold adjustments
const AVERAGE_DPI = 1600; // Adjust based on common high-DPI mouse settings
const DPI_NORMALIZATION_FACTOR = AVERAGE_DPI / 800; // Normalize for high-DPI devices
const MAX_HUMAN_ACCELERATION = 50000; // Threshold for human-like acceleration

const Portal = () => {
  // State variables
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [interactionData, setInteractionData] = useState({
    avgCursorSpeed: 0,
    cursorAcceleration: 0,
    pathDeviation: 0,
    idleTime: 0,
    jitter: 0,
    clickPattern: 0,
    typingSpeed: 0,
    keyPressDuration: 0,
    keyTransitionTime: 0,
    keyTransitionStdDev: 0,
    typingAccuracy: 100,
    errorRate: 0,
    sessionDuration: 0,
    averageDwellTime: 0,
    scrollBehavior: 0,
    interactionComplexity: 0,
  });
  
  // Additional state variables
  const [clickCount, setClickCount] = useState(0);
  const [keystrokeDurations, setKeystrokeDurations] = useState([]);
  const [scrollDistance, setScrollDistance] = useState(0);
  const [idleTime, setIdleTime] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [dwellTimes, setDwellTimes] = useState([]);
  const [keyTransitionTimes, setKeyTransitionTimes] = useState([]);
  
  // Refs for tracking events
  const keyDownTimes = useRef({});
  const lastKeyDownTimeRef = useRef(null);
  const sessionStartRef = useRef(performance.now());
  const lastInteractionTimeRef = useRef(sessionStartRef.current);
  const lastCursorPositionRef = useRef({ x: null, y: null, time: null });
  const lastScrollPositionRef = useRef(window.scrollY);
  const lastFocusTimeRef = useRef(null);
  
  // Ref to keep track of the latest avgCursorSpeed
  const avgCursorSpeedRef = useRef(interactionData.avgCursorSpeed);

  // Update the ref whenever avgCursorSpeed changes
  useEffect(() => {
    avgCursorSpeedRef.current = interactionData.avgCursorSpeed;
  }, [interactionData.avgCursorSpeed]);

  // Utility function to calculate standard deviation
  const calculateStandardDeviation = (values) => {
    const n = values.length;
    if (n === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
    return Math.sqrt(variance);
  };

  useEffect(() => {
    let mouseMoveEvents = [];

    // Throttle function to limit the frequency of event handler execution
    const throttle = (func, limit) => {
      let lastFunc;
      let lastRan;
      return function (...args) {
        const context = this;
        if (!lastRan) {
          func.apply(context, args);
          lastRan = Date.now();
        } else {
          clearTimeout(lastFunc);
          lastFunc = setTimeout(function () {
            if (Date.now() - lastRan >= limit) {
              func.apply(context, args);
              lastRan = Date.now();
            }
          }, limit - (Date.now() - lastRan));
        }
      };
    };

    const trackMouseMovement = throttle((event) => {
      const currentTime = performance.now();
      const lastCursorPosition = lastCursorPositionRef.current;

      if (lastCursorPosition.x !== null) {
        const dx = (event.clientX - lastCursorPosition.x) / DPI_NORMALIZATION_FACTOR;
        const dy = (event.clientY - lastCursorPosition.y) / DPI_NORMALIZATION_FACTOR;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const timeElapsed = (currentTime - lastCursorPosition.time) / 1000; // in seconds

        if (timeElapsed > 0 && timeElapsed < 5) {
          let speed = distance / timeElapsed;
          let acceleration = (speed - avgCursorSpeedRef.current) / timeElapsed;

          // Cap acceleration at a human threshold
          if (acceleration > MAX_HUMAN_ACCELERATION) {
            acceleration = MAX_HUMAN_ACCELERATION;
          } else if (acceleration < -MAX_HUMAN_ACCELERATION) {
            acceleration = -MAX_HUMAN_ACCELERATION;
          }

          // Collect mouse move events for advanced analysis
          mouseMoveEvents.push({
            speed,
            acceleration,
            time: currentTime,
          });

          // Keep only the last 50 events for moving average
          const recentMouseEvents = mouseMoveEvents.slice(-50);

          const avgSpeed =
            recentMouseEvents.reduce((sum, e) => sum + e.speed, 0) / recentMouseEvents.length;
          const avgAcceleration =
            recentMouseEvents.reduce((sum, e) => sum + e.acceleration, 0) / recentMouseEvents.length;

          // Calculate straight-line distance between last position and current position
          const straightLineDistance = Math.sqrt(
            (event.clientX - lastCursorPosition.x) ** 2 +
              (event.clientY - lastCursorPosition.y) ** 2
          );

          // Calculate path deviation as the absolute difference between actual distance and straight-line distance
          const deviation = Math.abs(distance - straightLineDistance);

          // Dynamic jitter threshold based on avgCursorSpeed
          const jitterThreshold = avgCursorSpeedRef.current * 0.05; // 5% of avg speed
          const movement = Math.sqrt(dx * dx + dy * dy);
          const isJitter = movement < jitterThreshold;

          setInteractionData((prevData) => {
            const updatedData = {
              ...prevData,
              avgCursorSpeed: avgSpeed,
              cursorAcceleration: avgAcceleration,
              pathDeviation:
                prevData.pathDeviation > 0
                  ? (prevData.pathDeviation * (recentMouseEvents.length - 1) + deviation) / recentMouseEvents.length
                  : deviation,
              jitter: isJitter ? prevData.jitter + 1 : prevData.jitter,
            };

            return updatedData;
          });
        }
      }

      lastCursorPositionRef.current = { x: event.clientX, y: event.clientY, time: currentTime };
      lastInteractionTimeRef.current = currentTime;
    }, 100); // Throttle to once every 100ms

    const handleClick = () => {
      setClickCount((prev) => prev + 1);
      lastInteractionTimeRef.current = performance.now();
    };

    const handleScroll = () => {
      const newScrollPosition = window.scrollY;
      const delta = Math.abs(newScrollPosition - lastScrollPositionRef.current);

      if (delta > 0) {
        setScrollDistance((prev) => prev + delta);
        lastInteractionTimeRef.current = performance.now();
      }
      lastScrollPositionRef.current = newScrollPosition;
    };

    const calculateIdleTime = () => {
      const currentTime = performance.now();
      const timeSinceLastInteraction = (currentTime - lastInteractionTimeRef.current) / 1000; // in seconds
      if (timeSinceLastInteraction > 1) {
        setIdleTime((prev) => prev + timeSinceLastInteraction);
        lastInteractionTimeRef.current = currentTime; // Reset lastInteractionTime
      }
    };

    // Key event handlers
    const handleKeyDown = (event) => {
      const currentTime = performance.now();

      if (!keyDownTimes.current[event.code]) {
        keyDownTimes.current[event.code] = currentTime;

        // Calculate key transition time
        if (lastKeyDownTimeRef.current !== null) {
          const transitionTime = currentTime - lastKeyDownTimeRef.current;
          setKeyTransitionTimes((prevTimes) => [...prevTimes, transitionTime]);
        }
        lastKeyDownTimeRef.current = currentTime;
        lastInteractionTimeRef.current = currentTime;
      }
    };

    const handleKeyUp = (event) => {
      const currentTime = performance.now();

      if (keyDownTimes.current[event.code]) {
        const keyPressDuration = currentTime - keyDownTimes.current[event.code];
        // Record keystroke duration (key press duration)
        setKeystrokeDurations((prevDurations) => [...prevDurations, keyPressDuration]);

        // Increment error count for specific keys
        if (event.key === 'Backspace' || event.key === 'Delete') {
          setErrorCount((prev) => prev + 1);
        }

        delete keyDownTimes.current[event.code];
      }
    };

    const handleFocusIn = (event) => {
      const target = event.target;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        target.addEventListener('keydown', handleKeyDown);
        target.addEventListener('keyup', handleKeyUp);
        lastFocusTimeRef.current = performance.now();
      }
    };

    const handleFocusOut = (event) => {
      const target = event.target;
      if (lastFocusTimeRef.current) {
        const dwellTime = performance.now() - lastFocusTimeRef.current;
        setDwellTimes((prevTimes) => [...prevTimes, dwellTime]);
        lastFocusTimeRef.current = null;
      }
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        target.removeEventListener('keydown', handleKeyDown);
        target.removeEventListener('keyup', handleKeyUp);
      }
    };

    // Event listeners
    document.addEventListener('mousemove', trackMouseMovement);
    document.addEventListener('click', handleClick);
    window.addEventListener('scroll', handleScroll);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    // Idle time calculation interval
    const idleInterval = setInterval(calculateIdleTime, 5000); // Every 5 seconds

    // Cleanup on unmount
    return () => {
      document.removeEventListener('mousemove', trackMouseMovement);
      document.removeEventListener('click', handleClick);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      clearInterval(idleInterval);
    };
  }, []); // Dependency array is empty as refs handle dynamic data

  // Aadhaar number input handler with validation
  const handleAadhaarChange = (e) => {
    const value = e.target.value.replace(/\s+/g, '');
    if (/^\d{0,12}$/.test(value)) {
      setAadhaarNumber(value);
      setErrorMessage('');
    } else {
      setErrorMessage('Aadhaar number must be exactly 12 digits.');
    }
  };

  // Helper function to calculate interaction complexity
  const calculateInteractionComplexity = () => {
    const {
      avgCursorSpeed,
      cursorAcceleration,
      pathDeviation,
      typingSpeed,
      scrollBehavior,
    } = interactionData;

    const interactionComplexity =
      avgCursorSpeed * 0.3 +
      cursorAcceleration * 0.2 +
      pathDeviation * 0.2 +
      typingSpeed * 0.2 +
      scrollBehavior * 0.1;

    return parseFloat(interactionComplexity.toFixed(2));
  };

  // Function to calculate typing accuracy
  const calculateTypingAccuracy = () => {
    const totalKeystrokes = keystrokeDurations.length;
    const correctKeystrokes = totalKeystrokes - errorCount;
    const typingAccuracy = totalKeystrokes > 0
      ? ((correctKeystrokes / totalKeystrokes) * 100).toFixed(2)
      : 100;

    return parseFloat(typingAccuracy);
  };

  // Function to parse and sanitize data before sending
  const sanitizeData = () => {
    const {
      avgCursorSpeed,
      cursorAcceleration,
      pathDeviation,
      idleTime,
      jitter,
      clickPattern,
      typingSpeed,
      keyPressDuration,
      keyTransitionTime,
      keyTransitionStdDev,
      typingAccuracy,
      errorRate,
      sessionDuration,
      averageDwellTime,
      scrollBehavior,
      interactionComplexity,
    } = interactionData;

    // Validate numerical fields
    const isValid =
      avgCursorSpeed >= 0 &&
      Math.abs(cursorAcceleration) <= MAX_HUMAN_ACCELERATION &&
      pathDeviation >= 0 &&
      idleTime >= 0 &&
      jitter >= 0 &&
      clickPattern >= 0 &&
      typingSpeed >= 0 &&
      keyPressDuration >= 0 &&
      keyTransitionTime >= 0 &&
      keyTransitionStdDev >= 0 &&
      typingAccuracy >= 0 &&
      errorRate >= 0 &&
      sessionDuration >= 0 &&
      averageDwellTime >= 0 &&
      scrollBehavior >= 0 &&
      interactionComplexity >= 0;

    return isValid;
  };

  // Login handler with data submission
  const handleLogin = async () => {
    // Capture the end time of the session
    const endTime = performance.now();
    const sessionDurationInSeconds = (endTime - sessionStartRef.current) / 1000; // Convert milliseconds to seconds

    // Compute averages and derived metrics
    const totalKeyPressDuration = keystrokeDurations.reduce((sum, dur) => sum + dur, 0);
    const averageKeyPressDuration =
      keystrokeDurations.length > 0 ? totalKeyPressDuration / keystrokeDurations.length : 0;

    const typingSpeed =
      sessionDurationInSeconds > 0
        ? (keystrokeDurations.length / (sessionDurationInSeconds / 60)).toFixed(2) // chars per minute
        : 0;

    const averageKeyTransitionTime =
      keyTransitionTimes.length > 0
        ? (keyTransitionTimes.reduce((sum, time) => sum + time, 0) / keyTransitionTimes.length).toFixed(2)
        : 0;

    const keyTransitionStdDev = calculateStandardDeviation(keyTransitionTimes).toFixed(2);

    const averageDwellTime =
      dwellTimes.length > 0
        ? (dwellTimes.reduce((sum, time) => sum + time, 0) / dwellTimes.length).toFixed(2)
        : 0;

    const errorRate =
      keystrokeDurations.length > 0
        ? ((errorCount / keystrokeDurations.length) * 100).toFixed(2)
        : 0;

    const typingAccuracy = calculateTypingAccuracy();

    const interactionComplexity = calculateInteractionComplexity();

    const formattedData = {
      userId: aadhaarNumber.trim() !== '' ? aadhaarNumber.trim() : 'anonymous-user',
      avgCursorSpeed: parseFloat(interactionData.avgCursorSpeed.toFixed(2)),
      cursorAcceleration: parseFloat(interactionData.cursorAcceleration.toFixed(2)),
      pathDeviation: parseFloat(interactionData.pathDeviation.toFixed(2)),
      idleTime: parseFloat(idleTime.toFixed(2)),
      jitter: parseFloat(interactionData.jitter.toFixed(2)),
      clickPattern: clickCount,
      typingSpeed: parseFloat(typingSpeed),
      keyPressDuration: parseFloat(averageKeyPressDuration.toFixed(2)),
      keyTransitionTime: parseFloat(averageKeyTransitionTime),
      keyTransitionStdDev: parseFloat(keyTransitionStdDev),
      typingAccuracy: typingAccuracy,
      errorRate: parseFloat(errorRate),
      sessionDuration: parseFloat(sessionDurationInSeconds.toFixed(2)),
      averageDwellTime: parseFloat(averageDwellTime),
      scrollBehavior: parseFloat(scrollDistance.toFixed(2)),
      interactionComplexity: interactionComplexity,
    };

    // Validate data before sending
    if (!sanitizeData()) {
      setErrorMessage('Detected invalid interaction data. Please try again.');
      return;
    }

    // Debugging: Log formatted data before sending
    console.log('--- Formatted Data to Send ---', formattedData);

    try {
      const response = await axios.post('http://localhost:5000/api/collect-data', formattedData);
      console.log('Server Response:', response.data);
      console.log('Updated Interaction Data:', interactionData);
    } catch (error) {
      console.error('Error sending interaction data to backend:', error);
      setErrorMessage('Failed to send data to the server. Please try again.');
    }

    if (aadhaarNumber.length === 12) {
      alert('Login successful!');
    } else {
      setErrorMessage('Please enter a valid 12-digit Aadhaar number.');
    }

    // Reset session start time for the next session
    sessionStartRef.current = performance.now();
  };

  return (
    <div className="portal-container">
      <h2>Login Portal</h2>
      <div className="form-group">
        <label htmlFor="aadhaarNumber">Aadhaar Number:</label>
        <input
          type="text"
          id="aadhaarNumber"
          value={aadhaarNumber}
          onChange={handleAadhaarChange}
          placeholder="Enter your 12-digit Aadhaar number"
          maxLength={12}
        />
        {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
      </div>
      {/* Removed Captcha as it's not used */}
      <button
        id="loginButton"
        onClick={handleLogin}
        disabled={aadhaarNumber.length !== 12}
      >
        Login
      </button>
      <footer>
        <p>Note: This page collects data for research purposes.</p>
      </footer>
    </div>
  );
};

export default Portal;
