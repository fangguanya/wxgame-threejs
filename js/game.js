import * as THREE from '../libs/threejs/three.min'
import * as OIMO from '../libs/threejs/plugins/oimo.min'
import { Human } from "./human";

import * as NAV from "./navigation"
import '../libs/threejs/controls/OrbitControls'

// 网格数量
const length = 20

let instance

// three var
var camera, scene, light, container;
var geos = {};
var mats = {};

// human
var human;
var nHuman = 6;

// oimo
var world = null;
var Hmeshs = {};
var Hbodys = {};
var bodys = [];
var meshs = [];

var collisionGroupes = {};

var ToRad = Math.PI / 180;
/**
 * 统一游戏管理
 */
export default class Game {
  constructor(renderer) {
    if (instance) {
      return instance
    }
    instance = this

    // 渲染器
    this.renderer = renderer

    window.camera = camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 10000);
    NAV.initCamera(90, 60, 1800);

    scene = new THREE.Scene();

    // lights
    scene.add(new THREE.AmbientLight(0x3D4143));
    light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(300, 1000, 500);
    light.target.position.set(0, 0, 0);
    light.castShadow = true;

    var d = 500;
    light.shadow.camera = new THREE.OrthographicCamera(-d, d, d, -d, 500, 1600);
    light.shadow.bias = 0.0001;
    light.shadow.mapSize.width = light.shadow.mapSize.height = 1024;
    scene.add(light);

    // background
    var buffgeoBack = new THREE.BufferGeometry();
    buffgeoBack.fromGeometry(new THREE.IcosahedronGeometry(8000, 1));
    var back = new THREE.Mesh(buffgeoBack, new THREE.MeshLambertMaterial({ color: 0xAA8058, name: 'box' }));
    back.geometry.applyMatrix(new THREE.Matrix4().makeRotationZ(15 * ToRad));
    scene.add(back);

    // geometrys
    geos['sphere'] = new THREE.BufferGeometry();
    geos['sphere'].fromGeometry(new THREE.SphereGeometry(1, 20, 10));
    geos['box'] = new THREE.BufferGeometry();
    geos['box'].fromGeometry(new THREE.BoxGeometry(1, 1, 1));

    // materials
    mats['sph'] = new THREE.MeshPhongMaterial({ color: 0x99999A, name: 'sph', specular: 0xFFFFFF, shininess: 120, transparent: true, opacity: 0.9 });
    mats['box'] = new THREE.MeshLambertMaterial({ color: 0xAA8058, name: 'box' });
    mats['ssph'] = new THREE.MeshPhongMaterial({ color: 0x666667, name: 'ssph', specular: 0xFFFFFF, shininess: 120, transparent: true, opacity: 0.7 });
    mats['sbox'] = new THREE.MeshLambertMaterial({ color: 0x383838, name: 'sbox' });
    mats['ground'] = new THREE.MeshLambertMaterial({ color: 0x3D4143 });

    NAV.initEvents();
    this.initOimoPhysics();
    this.initWalk()
  }
  /**
   * 创建角色相关
   */
  initHuman() {
    // document.getElementById("walk").addEventListener("click", initWalk, false);
    // document.getElementById("run").addEventListener("click", initRun, false);

    human = new Human();
    human.zw = 1000;
    human.zh = 400;
    this.initWalk();
  }

  initWalk() {
    human.initWalk();
  }

  initRun() {
    human.initRun();
  }

  /**
   * 创建物理相关
   */
  initOimoPhysics() {
    collisionGroupes = {
      group1: 1 << 0,  // 00000000 00000000 00000000 00000001
      group2: 1 << 1,  // 00000000 00000000 00000000 00000010
      group3: 1 << 2,  // 00000000 00000000 00000000 00000100
      all: 0xffffffff  // 11111111 11111111 11111111 11111111
    };

    world = new OIMO.World({ info: false, worldscale: 100 });

    this.addStaticBox([1000, 40, 1000], [0, -18, 0], [0, 0, 0]);

    // make physics humans
    this.initHuman();

    var bone, name, size, pos;
    for (var i = 0; i < nHuman; i++) {
      for (var key in human.bones) {
        bone = human.bones[key];
        name = key + i;
        pos = [bone.x, bone.y, bone.z];
        size = [bone.height, bone.width, bone.deepth];
        if (key == 'head') this.addOimoObject(name, pos, [16], 1);
        else this.addOimoObject(name, pos, size, 2);
      }
    }

    // add random object
    var config = [1, 0.4, 0.2, collisionGroupes.group2, collisionGroupes.all];
    var x, y, z, w, h, d, t;
    var i = 100;

    while (i--) {
      t = Math.floor(Math.random() * 2) + 1;
      x = -400 + Math.random() * 800;
      z = -400 + Math.random() * 800;
      y = 100 + Math.random() * 1000;
      w = 10 + Math.random() * 30;
      h = 10 + Math.random() * 30;
      d = 10 + Math.random() * 30;

      if (t === 1) {
        bodys[i] = world.add({ type: 'sphere', size: [w * 0.5], pos: [x, y, z], move: true, world: world, config: config });
        meshs[i] = new THREE.Mesh(geos.sphere, mats.sph);
        meshs[i].scale.set(w * 0.5, w * 0.5, w * 0.5);
      } else if (t === 2) {
        bodys[i] = world.add({ type: 'box', size: [w, h, d], pos: [x, y, z], move: true, world: world, config: config });
        meshs[i] = new THREE.Mesh(geos.box, mats.box);
        meshs[i].scale.set(w, h, d);
      }

      meshs[i].castShadow = true;
      meshs[i].receiveShadow = true;

      scene.add(meshs[i]);
    }

    // setInterval(this.updateOimoPhysics, 1000 / 60);
  }

  addOimoObject(name, pos, size, type) {
    var config = [10, 0.4, 0.2, collisionGroupes.group1, collisionGroupes.group2];
    var mesh, body;
    var pos = pos || [0, 0, 0];
    var size = size || [10, 10, 10];
    if (type == 1) {
      body = world.add({ type: 'sphere', name: name, size: size, pos: pos, move: true, noSleep: true, world: world, config: config });
      mesh = new THREE.Mesh(geos.sphere, mats.ssph);
      mesh.scale.set(size[0], size[0], size[0]);
    } else if (type == 2) {
      body = world.add({ type: 'box', name: name, size: size, pos: pos, move: true, noSleep: true, world: world, config: config });
      mesh = new THREE.Mesh(this.capsuleGeometry(size[0] / 2, size[1] - (size[0] / 2)), mats.box);
      if (name.substr(0, 4) == 'body') mesh.scale.set(1, 1, 1.8);
    } else {
      body = world.add({ type: 'box', name: name, size: size, pos: pos, move: true, noSleep: true, world: world, config: config });
      mesh = new THREE.Mesh(geos.box, mats.box);
      mesh.scale.set(size[0], size[1], size[2]);
    }

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    Hmeshs[name] = mesh;
    Hbodys[name] = body;
  }

  updateOimoPhysics() {
    world.step();

    //update humans
    human.update();
    var bone, name;
    var mtx, mtx2;
    var pos = new THREE.Vector3(), quat = new THREE.Quaternion();
    for (var i = 0; i < nHuman; i++) {
      for (var key in human.bones) {
        bone = human.bones[key];
        name = key + i;

        mtx = new THREE.Matrix4();
        mtx.makeTranslation(bone.x - 500, 400 - bone.y, bone.z + (i * 120) - 250);

        mtx2 = new THREE.Matrix4();
        mtx2.makeRotationZ(-bone.rotation + (90 * ToRad));
        mtx.multiply(mtx2);

        mtx2 = new THREE.Matrix4();
        mtx2.makeTranslation(0, -bone.width * 0.5, 0);
        mtx.multiply(mtx2);

        pos.setFromMatrixPosition(mtx);
        quat.setFromRotationMatrix(mtx);

        Hbodys[name].setPosition(pos);
        Hbodys[name].setQuaternion(quat);
        Hmeshs[name].position.copy(pos);
        Hmeshs[name].quaternion.copy(quat);
      }
    }

    // update random object
    var x, y, z;
    var i = bodys.length;
    var mesh;
    var body;

    while (i--) {
      body = bodys[i];
      mesh = meshs[i];

      if (!body.sleeping) {

        mesh.position.copy(body.getPosition());
        mesh.quaternion.copy(body.getQuaternion());

        // change material
        if (mesh.material.name === 'sbox') mesh.material = mats.box;
        if (mesh.material.name === 'ssph') mesh.material = mats.sph;

        // reset position
        if (mesh.position.y < -100) {
          x = -100 + Math.random() * 200;
          z = -100 + Math.random() * 200;
          y = 100 + Math.random() * 1000;
          body.resetPosition(x, y, z);
        }
      } else {
        if (mesh.material.name === 'box') mesh.material = mats.sbox;
        if (mesh.material.name === 'sph') mesh.material = mats.ssph;
      }
    }
  }
  /**
   * 创建网格
   */
  addStaticBox(size, position, rotation) {
    var mesh = new THREE.Mesh(geos.box, mats.ground);
    mesh.scale.set(size[0], size[1], size[2]);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.rotation.set(rotation[0] * ToRad, rotation[1] * ToRad, rotation[2] * ToRad);
    scene.add(mesh);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }

  capsuleGeometry(radius, height, SRadius, SHeight) {
    var sRadius = SRadius || 20;
    var sHeight = SHeight || 10;
    var o0 = Math.PI * 2;
    var o1 = Math.PI / 2;
    var g = new THREE.Geometry();
    var m0 = new THREE.CylinderGeometry(radius, radius, height, sRadius, 1, true);
    var m1 = new THREE.SphereGeometry(radius, sRadius, sHeight, 0, o0, 0, o1);
    var m2 = new THREE.SphereGeometry(radius, sRadius, sHeight, 0, o0, o1, o1);
    var mtx0 = new THREE.Matrix4().makeTranslation(0, 0, 0);
    var mtx1 = new THREE.Matrix4().makeTranslation(0, height * 0.5, 0);
    var mtx2 = new THREE.Matrix4().makeTranslation(0, -height * 0.5, 0);
    g.merge(m0, mtx0);
    g.merge(m1, mtx1);
    g.merge(m2, mtx2);
    var geo = new THREE.BufferGeometry();
    geo.fromGeometry(g);
    return geo;
  }

  /**
   * 更新游戏
   */
  update() {
    this.updateOimoPhysics()
  }

  /**
   * 渲染游戏
   */
  render() {
    this.update()
    this.renderer.render(scene, camera)
  }
}
