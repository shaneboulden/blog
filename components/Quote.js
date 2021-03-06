import PropTypes from 'prop-types'

const Quote = ({ quote }) => (
  <blockquote className="relative p-4 text-xl italic border-l-4 bg-neutral-100 text-neutral-600 border-neutral-500 quote">
    <p className="mb-4">{ quote }</p>
  </blockquote>
)

Quote.propTypes = {
 quote: PropTypes.string,
}

export default Quote
