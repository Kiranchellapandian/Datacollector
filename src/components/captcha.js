import React from 'react';

const Captcha = () => {
  return (
    <div className="captcha-container">
      <h3>Captcha Verification</h3>
      <div className="captcha-checkbox">
        <input type="checkbox" id="robotCheck" />
        <label htmlFor="robotCheck">I'm not a robot</label>
      </div>
    </div>
  );
};

export default Captcha;
