import AssociativeArray from "../Core/AssociativeArray.js";
import BoundingSphere from "../Core/BoundingSphere.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import Color from "../Core/Color.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import Matrix4 from "../Core/Matrix4.js";
import Resource from "../Core/Resource.js";
import ColorBlendMode from "../Scene/ColorBlendMode.js";
import HeightReference, {
  isHeightReferenceClamp,
} from "../Scene/HeightReference.js";
import Model from "../Scene/Model/Model.js";
import ModelAnimationLoop from "../Scene/ModelAnimationLoop.js";
import ShadowMode from "../Scene/ShadowMode.js";
import BoundingSphereState from "./BoundingSphereState.js";
import Property from "./Property.js";
import Cartographic from "../Core/Cartographic.js";

const defaultScale = 1.0;
const defaultEnableVerticalExaggeration = true;
const defaultMinimumPixelSize = 0.0;
const defaultIncrementallyLoadTextures = true;
const defaultClampAnimations = true;
const defaultShadows = ShadowMode.ENABLED;
const defaultHeightReference = HeightReference.NONE;
const defaultSilhouetteColor = Color.RED;
const defaultSilhouetteSize = 0.0;
const defaultColor = Color.WHITE;
const defaultColorBlendMode = ColorBlendMode.HIGHLIGHT;
const defaultColorBlendAmount = 0.5;
const defaultImageBasedLightingFactor = new Cartesian2(1.0, 1.0);

const modelMatrixScratch = new Matrix4();
const nodeMatrixScratch = new Matrix4();

const scratchColor = new Color();
const scratchArray = new Array(4);
const scratchCartesian = new Cartesian3();

/**
 * 一个 {@link Visualizer}，用于将 {@link Entity#model} 映射到 {@link Model}。
 * @alias ModelVisualizer
 * @constructor
 *
 * @param {Scene} scene 将在其中渲染基元的场景。
 * @param {EntityCollection} entityCollection 要可视化的 entityCollection。
 */
function ModelVisualizer(scene, entityCollection) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("scene", scene);
  Check.typeOf.object("entityCollection", entityCollection);
  //>>includeEnd('debug');

  entityCollection.collectionChanged.addEventListener(
    ModelVisualizer.prototype._onCollectionChanged,
    this,
  );

  this._scene = scene;
  this._primitives = scene.primitives;
  this._entityCollection = entityCollection;
  this._modelHash = {};
  this._entitiesToVisualize = new AssociativeArray();

  this._onCollectionChanged(entityCollection, entityCollection.values, [], []);
}

async function createModelPrimitive(
  visualizer,
  entity,
  resource,
  incrementallyLoadTextures,
) {
  const primitives = visualizer._primitives;
  const modelHash = visualizer._modelHash;

  try {
    const model = await Model.fromGltfAsync({
      url: resource,
      incrementallyLoadTextures: incrementallyLoadTextures,
      scene: visualizer._scene,
    });

    if (visualizer.isDestroyed() || !defined(modelHash[entity.id])) {
      return;
    }

    model.id = entity;
    primitives.add(model);
    modelHash[entity.id].modelPrimitive = model;
    model.errorEvent.addEventListener((error) => {
      if (!defined(modelHash[entity.id])) {
        return;
      }

      console.log(error);

      // Texture failures when incrementallyLoadTextures
      // will not affect the ability to compute the bounding sphere
      if (error.name !== "TextureError" && model.incrementallyLoadTextures) {
        modelHash[entity.id].loadFailed = true;
      }
    });
  } catch (error) {
    if (visualizer.isDestroyed() || !defined(modelHash[entity.id])) {
      return;
    }

    console.log(error);
    modelHash[entity.id].loadFailed = true;
  }
}

/**
 * 更新创建此可视化工具的模型以匹配其
 * 给定时间的实体对应项。
 *
 * @param {JulianDate} time 更新到的时间。
 * @returns {boolean} 此函数始终返回 true。
 */
ModelVisualizer.prototype.update = function (time) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(time)) {
    throw new DeveloperError("time is required.");
  }
  //>>includeEnd('debug');

  const entities = this._entitiesToVisualize.values;
  const modelHash = this._modelHash;
  const primitives = this._primitives;

  for (let i = 0, len = entities.length; i < len; i++) {
    const entity = entities[i];
    const modelGraphics = entity._model;

    let resource;
    let modelData = modelHash[entity.id];
    let show =
      entity.isShowing &&
      entity.isAvailable(time) &&
      Property.getValueOrDefault(modelGraphics._show, time, true);

    let modelMatrix;
    if (show) {
      modelMatrix = entity.computeModelMatrix(time, modelMatrixScratch);
      resource = Resource.createIfNeeded(
        Property.getValueOrUndefined(modelGraphics._uri, time),
      );
      show = defined(modelMatrix) && defined(resource);
    }

    if (!show) {
      if (defined(modelData) && modelData.modelPrimitive) {
        modelData.modelPrimitive.show = false;
      }
      continue;
    }

    if (!defined(modelData) || resource.url !== modelData.url) {
      if (defined(modelData?.modelPrimitive)) {
        primitives.removeAndDestroy(modelData.modelPrimitive);
        delete modelHash[entity.id];
      }

      modelData = {
        modelPrimitive: undefined,
        url: resource.url,
        animationsRunning: false,
        nodeTransformationsScratch: {},
        articulationsScratch: {},
        loadFailed: false,
        modelUpdated: false,
      };
      modelHash[entity.id] = modelData;

      const incrementallyLoadTextures = Property.getValueOrDefault(
        modelGraphics._incrementallyLoadTextures,
        time,
        defaultIncrementallyLoadTextures,
      );

      createModelPrimitive(this, entity, resource, incrementallyLoadTextures);
    }

    const model = modelData.modelPrimitive;
    if (!defined(model)) {
      continue;
    }

    model.show = true;
    model.scale = Property.getValueOrDefault(
      modelGraphics._scale,
      time,
      defaultScale,
    );

    model.enableVerticalExaggeration = Property.getValueOrDefault(
      modelGraphics._enableVerticalExaggeration,
      time,
      defaultEnableVerticalExaggeration,
    );

    model.minimumPixelSize = Property.getValueOrDefault(
      modelGraphics._minimumPixelSize,
      time,
      defaultMinimumPixelSize,
    );
    model.maximumScale = Property.getValueOrUndefined(
      modelGraphics._maximumScale,
      time,
    );
    model.modelMatrix = Matrix4.clone(modelMatrix, model.modelMatrix);
    model.shadows = Property.getValueOrDefault(
      modelGraphics._shadows,
      time,
      defaultShadows,
    );
    model.heightReference = Property.getValueOrDefault(
      modelGraphics._heightReference,
      time,
      defaultHeightReference,
    );
    model.distanceDisplayCondition = Property.getValueOrUndefined(
      modelGraphics._distanceDisplayCondition,
      time,
    );
    model.silhouetteColor = Property.getValueOrDefault(
      modelGraphics._silhouetteColor,
      time,
      defaultSilhouetteColor,
      scratchColor,
    );
    model.silhouetteSize = Property.getValueOrDefault(
      modelGraphics._silhouetteSize,
      time,
      defaultSilhouetteSize,
    );
    model.color = Property.getValueOrDefault(
      modelGraphics._color,
      time,
      defaultColor,
      scratchColor,
    );
    model.colorBlendMode = Property.getValueOrDefault(
      modelGraphics._colorBlendMode,
      time,
      defaultColorBlendMode,
    );
    model.colorBlendAmount = Property.getValueOrDefault(
      modelGraphics._colorBlendAmount,
      time,
      defaultColorBlendAmount,
    );
    model.clippingPlanes = Property.getValueOrUndefined(
      modelGraphics._clippingPlanes,
      time,
    );
    model.clampAnimations = Property.getValueOrDefault(
      modelGraphics._clampAnimations,
      time,
      defaultClampAnimations,
    );
    model.imageBasedLighting.imageBasedLightingFactor =
      Property.getValueOrDefault(
        modelGraphics._imageBasedLightingFactor,
        time,
        defaultImageBasedLightingFactor,
      );
    let lightColor = Property.getValueOrUndefined(
      modelGraphics._lightColor,
      time,
    );

    // Convert from Color to Cartesian3
    if (defined(lightColor)) {
      Color.pack(lightColor, scratchArray, 0);
      lightColor = Cartesian3.unpack(scratchArray, 0, scratchCartesian);
    }

    model.lightColor = lightColor;
    model.customShader = Property.getValueOrUndefined(
      modelGraphics._customShader,
      time,
    );

    // It's possible for getBoundingSphere to run before
    // model becomes ready and these properties are updated
    modelHash[entity.id].modelUpdated = true;

    if (model.ready) {
      const runAnimations = Property.getValueOrDefault(
        modelGraphics._runAnimations,
        time,
        true,
      );
      if (modelData.animationsRunning !== runAnimations) {
        if (runAnimations) {
          model.activeAnimations.addAll({
            loop: ModelAnimationLoop.REPEAT,
          });
        } else {
          model.activeAnimations.removeAll();
        }
        modelData.animationsRunning = runAnimations;
      }

      // Apply node transformations
      const nodeTransformations = Property.getValueOrUndefined(
        modelGraphics._nodeTransformations,
        time,
        modelData.nodeTransformationsScratch,
      );
      if (defined(nodeTransformations)) {
        const nodeNames = Object.keys(nodeTransformations);
        for (
          let nodeIndex = 0, nodeLength = nodeNames.length;
          nodeIndex < nodeLength;
          ++nodeIndex
        ) {
          const nodeName = nodeNames[nodeIndex];

          const nodeTransformation = nodeTransformations[nodeName];
          if (!defined(nodeTransformation)) {
            continue;
          }

          const modelNode = model.getNode(nodeName);
          if (!defined(modelNode)) {
            continue;
          }

          const transformationMatrix = Matrix4.fromTranslationRotationScale(
            nodeTransformation,
            nodeMatrixScratch,
          );
          modelNode.matrix = Matrix4.multiply(
            modelNode.originalMatrix,
            transformationMatrix,
            transformationMatrix,
          );
        }
      }

      // Apply articulations
      let anyArticulationUpdated = false;
      const articulations = Property.getValueOrUndefined(
        modelGraphics._articulations,
        time,
        modelData.articulationsScratch,
      );
      if (defined(articulations)) {
        const articulationStageKeys = Object.keys(articulations);
        for (
          let s = 0, numKeys = articulationStageKeys.length;
          s < numKeys;
          ++s
        ) {
          const key = articulationStageKeys[s];

          const articulationStageValue = articulations[key];
          if (!defined(articulationStageValue)) {
            continue;
          }

          anyArticulationUpdated = true;
          model.setArticulationStage(key, articulationStageValue);
        }
      }

      if (anyArticulationUpdated) {
        model.applyArticulations();
      }
    }
  }

  return true;
};

/**
 * 如果此对象已销毁，则返回 true;否则为 false。
 *
 * @returns {boolean} 如果此对象被销毁，则为 True;否则为 false。
 */
ModelVisualizer.prototype.isDestroyed = function () {
  return false;
};

/**
 * 删除并销毁此实例创建的所有基元。
 */
ModelVisualizer.prototype.destroy = function () {
  this._entityCollection.collectionChanged.removeEventListener(
    ModelVisualizer.prototype._onCollectionChanged,
    this,
  );
  const entities = this._entitiesToVisualize.values;
  const modelHash = this._modelHash;
  const primitives = this._primitives;
  for (let i = entities.length - 1; i > -1; i--) {
    removeModel(this, entities[i], modelHash, primitives);
  }
  return destroyObject(this);
};

const scratchPosition = new Cartesian3();
const scratchCartographic = new Cartographic();
/**
 * 计算一个边界球体，该球体包含为指定实体生成的可视化效果。
 * 边界球体位于场景地球的固定帧中。
 *
 * @param {Entity} entity 要计算其边界球体的实体。
 * @param {BoundingSphere} result 要存储结果的边界球体。
 * @returns {BoundingSphereState} BoundingSphereState.DONE（如果结果包含边界球体），
 * BoundingSphereState.PENDING（如果结果仍在计算中），或者
 * BoundingSphereState.FAILED，如果实体在当前场景中没有可视化效果。
 * @private
 */
ModelVisualizer.prototype.getBoundingSphere = function (entity, result) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(entity)) {
    throw new DeveloperError("entity is required.");
  }
  if (!defined(result)) {
    throw new DeveloperError("result is required.");
  }
  //>>includeEnd('debug');

  const modelData = this._modelHash[entity.id];
  if (!defined(modelData)) {
    return BoundingSphereState.FAILED;
  }

  if (modelData.loadFailed) {
    return BoundingSphereState.FAILED;
  }

  const model = modelData.modelPrimitive;
  if (!defined(model) || !model.show) {
    return BoundingSphereState.PENDING;
  }

  if (!model.ready || !modelData.modelUpdated) {
    return BoundingSphereState.PENDING;
  }

  const scene = this._scene;
  const ellipsoid = defaultValue(scene.ellipsoid, Ellipsoid.default);

  const hasHeightReference = model.heightReference !== HeightReference.NONE;
  if (hasHeightReference) {
    const modelMatrix = model.modelMatrix;
    scratchPosition.x = modelMatrix[12];
    scratchPosition.y = modelMatrix[13];
    scratchPosition.z = modelMatrix[14];
    const cartoPosition = ellipsoid.cartesianToCartographic(
      scratchPosition,
      scratchCartographic,
    );

    const height = scene.getHeight(cartoPosition, model.heightReference);
    if (defined(height)) {
      if (isHeightReferenceClamp(model.heightReference)) {
        cartoPosition.height = height;
      } else {
        cartoPosition.height += height;
      }
    }

    BoundingSphere.clone(model.boundingSphere, result);
    result.center = ellipsoid.cartographicToCartesian(cartoPosition);
    return BoundingSphereState.DONE;
  }

  BoundingSphere.clone(model.boundingSphere, result);
  return BoundingSphereState.DONE;
};

/**
 * @private
 */
ModelVisualizer.prototype._onCollectionChanged = function (
  entityCollection,
  added,
  removed,
  changed,
) {
  let i;
  let entity;
  const entities = this._entitiesToVisualize;
  const modelHash = this._modelHash;
  const primitives = this._primitives;

  for (i = added.length - 1; i > -1; i--) {
    entity = added[i];
    if (defined(entity._model) && defined(entity._position)) {
      entities.set(entity.id, entity);
    }
  }

  for (i = changed.length - 1; i > -1; i--) {
    entity = changed[i];
    if (defined(entity._model) && defined(entity._position)) {
      clearNodeTransformationsArticulationsScratch(entity, modelHash);
      entities.set(entity.id, entity);
    } else {
      removeModel(this, entity, modelHash, primitives);
      entities.remove(entity.id);
    }
  }

  for (i = removed.length - 1; i > -1; i--) {
    entity = removed[i];
    removeModel(this, entity, modelHash, primitives);
    entities.remove(entity.id);
  }
};

function removeModel(visualizer, entity, modelHash, primitives) {
  const modelData = modelHash[entity.id];
  if (defined(modelData)) {
    primitives.removeAndDestroy(modelData.modelPrimitive);
    delete modelHash[entity.id];
  }
}

function clearNodeTransformationsArticulationsScratch(entity, modelHash) {
  const modelData = modelHash[entity.id];
  if (defined(modelData)) {
    modelData.nodeTransformationsScratch = {};
    modelData.articulationsScratch = {};
  }
}

export default ModelVisualizer;
