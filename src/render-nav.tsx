import { renderToString } from 'react-dom/server'
import { SiteNavigation } from './site-navigation'
import { items } from './navbar-config'

// Identical server and browser markup avoids a navigation flash during hydration.
const markup = Object.fromEntries(items.map((item, index) => [item.label, renderToString(<SiteNavigation activeIndex={index}/>)]))
process.stdout.write(JSON.stringify(markup))
