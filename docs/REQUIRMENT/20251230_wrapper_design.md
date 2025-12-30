# Main Page Layout

because this project use 2 way to navigator, so we can not use nuxt layout to handle common layout. so we have wrapper folder in /app/components/wrapper to control differnet wrapper, for example 

WrapperMain <- generate layout for all pages
it contain 2 page 
- Main Menu
- Content <slot/>

Main Menu should have 2 stage
on Desktop a aside element which stick to left 
on Mobile a toggle stiick to top left or bottom left, and click to slide in the menu

main menu
contain of 3 part
logo
menu
footer 

and the display has 2 stage
collapse - only show icon
expand - show both icon and label

For workspace layout, because i want to share wrapper to all /workspace 
so i like to add a [..all].vue page in /pages/workspaces/[slug]/ so this page will get all page under /workspaces/slug

then we can create a wrapper workspace to handle different view of workspace
/
/setting
/folder/slug
/folder/slug/setting
/view/slug
/view/slug/setting
/dashboard/slug
/dashboard/slug/setting
...etc

wrapperWorkspace should layout should contain 2 main part

left side 
  - workspace menu
right side
  - workspace header
     - breadcrumb
     - header right ( add id to it so content can teleport actions button to header)
  - content (depend on route to disaply different component )

and ofr workspace menu
the idea is almost same as main menu
top (workspace name)
middle (workflow menu)
footer ( setting / other actions)

and make sure wrapperworkspace is wrap by wrapper main

so workspace menu is also responsive, but the menu toggle button is on workflow header

please make sure all responsive is using container query not media query