/* eslint-disable jsx-a11y/anchor-has-content */
import Link from 'next/link'

const CustomLink = ({ href, ...rest }) => {
  const isInternalLink = href && href.startsWith('/')
  const isAnchorLink = href && href.startsWith('#')

  if (isInternalLink) {
    return (
      <Link 
        href={href}
        className="text-primary-800 hover:text-primary-900 dark:!text-primary-600 dark:hover:!text-primary-500">
        <a {...rest} />
      </Link>
    )
  }

  if (isAnchorLink) {
    return <a href={href} {...rest} />
  }

  return <a target="_blank" rel="noopener noreferrer" className="text-primary-800 hover:text-primary-900 dark:!text-primary-600 dark:hover:!text-primary-500" href={href} {...rest} />
}

export default CustomLink
