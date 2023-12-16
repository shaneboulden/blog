import React from "react";
import PropTypes from "prop-types";

const IFrameEmbed = ({ src }) => (
  <div className="iframe-embedded">
    <iframe
      height="480"
      width="100%"
      src={ src }
      style={{ border: '0px', overflow: 'hidden' }}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      title="Embedded webpage"
    />
  </div>
);

IFrameEmbed.propTypes = {
  src: PropTypes.string.isRequired
};

export default IFrameEmbed;
