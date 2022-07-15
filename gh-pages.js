import { publish } from 'gh-pages';

publish(
 'build', // path to public directory
 {
  branch: 'build',
  repo: 'https://github.com/1757WestwoodRobotics/1757westwoodrobotics.github.io.git', // Update to point to your repository
  user: {
   name: 'Westwood High School Robotics FRC 1757', // update to use your name
   email: 'westwoodrobotics@gmail.com' // Update to use your email
  },
  dotfiles: true
  },
  () => {
   console.log('Deploy Complete!');
  }
);
