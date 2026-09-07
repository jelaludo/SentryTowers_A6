// Preview locomotion around a closed path; exported gait clips remain in place.
export class CircularTravel {
  constructor(radius=2.2){this.radius=radius;this.distance=0;}
  reset(root){this.distance=0;if(root){root.position.x=0;root.position.z=0;root.rotation.y=0;}}
  update(root,dt,speed){this.distance+=dt*speed;const angle=this.distance/this.radius;root.position.x=this.radius*(1-Math.cos(angle));root.position.z=this.radius*Math.sin(angle);root.rotation.y=angle%(Math.PI*2);}
}
