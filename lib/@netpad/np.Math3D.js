/**
 * Created by ycsm on 2018/3/21.
 */
if (!np) np = {}

//依赖于 sylvester 与jquery
np.Math3D = (function () {


    var sylLine = Line,
        sylPlane = Plane,
        sylVector = Vector;


    var EP = 0.000001,//EP值，计算时判定的误差,
        PI = Math.PI,
        PI_2 = PI * 2,//缓存2pi
        halfPI = PI / 2,

        precision = 6;

    var vector3_x = [1, 0, 0],//x方向的单位向量
        vector3_y = [0, 1, 0],//y方向的单位向量
        vector3_z = [0, 0, 1];//z方向的单位向量

    var round = Math.round,
        max = Math.max,
        min = Math.min,
        sqrt = Math.sqrt,//依赖开方
        pow = Math.pow,
        abs = Math.abs,// 依赖绝对值
        cos = Math.cos,
        sin = Math.sin,
        tan = Math.tan,
        acos = Math.acos,
        atan = Math.atan,
        asin = Math.asin;

    var eye = 50;

    var unitArc = PI / 180,
        unitAngle = 180 / PI;


    //X轴,Y轴,Z轴
    var sylXAxis = sylLine.create([0, 0, 0], [1, 0, 0]),
        sylYAxis = sylLine.create([0, 0, 0], [0, 1, 0]),
        sylZAxis = sylLine.create([0, 0, 0], [0, 0, 1]);


    ///////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////
    /*
     * 各种缓存，用以提高计算效率
     * */
    var thetasCache = {};//0-2pi的theta值缓存，键为份数值，值为将0-2pi分为对应的份数的弧度值组成的数组；
    var cosCache = {};
    var sinCache = {};
    var acosCache = {};
    var asinCache = {};
    var atanCache = {};
    var tanCache = {};

    var roundNessArr = [
        [16, 32],
        [18, 32],
        [20, 36],
        [20, 42],
        [24, 48],
        [28, 56],
        [32, 60],
        [36, 70],
        [40, 72],
        [44, 84],
        [48, 84],
        [52, 98],
        [56, 96],
        [60, 112]
    ];


    var sq2 = Math.sqrt(2.0),
        sq3 = Math.sqrt(3.0);

    var TETCIRCLE_R = 2 / (sqrt(6) * cos(PI / 6));


    function getSphereXYNum(roundNessIndex) {
        roundNessIndex = roundNessIndex - 1;
        if (roundNessIndex < 0) roundNessIndex = 0;
        else if (roundNessIndex > 13) roundNessIndex = 13;
        return roundNessArr[roundNessIndex];
    }

    function getCylinderNum(roundNessIndex) {
        roundNessIndex = roundNessIndex - 1;
        if (roundNessIndex < 0) roundNessIndex = 0;
        else if (roundNessIndex > 13) roundNessIndex = 13;
        return roundNessArr[roundNessIndex][1];
    }


    /**
     * 取模
     * @param _num
     * @param _mod
     * @returns {number}
     */
    function numMod(_num, _mod) {
        return _num % _mod;
    }

    /**
     * 取精度
     * @param _num
     * @returns {string}
     */
    function numFix(_num) {
        return _num.toFixed(precision)
    }

    var getArcThea = function (_pointNum, sAngle, eAngle) {
        var angle;
        var start;
        if (sAngle == undefined || eAngle == undefined) {
            angle = PI_2;
            eAngle = PI_2;
            start = 0;
        } else {
            angle = eAngle - sAngle;
            start = sAngle;
        }

        var thetas = [], unit_thetas = angle / (_pointNum - 1);
        for (var i = 0; i < _pointNum - 1; i++) {
            thetas.push(start + unit_thetas * i);
        }
        thetas.push(eAngle);
        return thetas;
    };

    //更新thetasCache
    function getThetasCache(_num) {
        if (thetasCache[_num] == undefined) {
            thetasCache[_num] = getArcThea(_num);
        }
        return thetasCache[_num];
    }

    //更新tanCache
    function getTanCache(_num) {
        _num = numFix(numMod(_num + halfPI, PI) - halfPI);
        if (tanCache[_num] == undefined) tanCache[_num] = tan(_num);
        return tanCache[_num];
    }

    //更新cosCache
    function getCosCache(_num) {
        _num = numFix(numMod(_num, PI_2));
        if (cosCache[_num] == undefined) cosCache[_num] = cos(_num);
        return cosCache[_num];
    }

    //更新sinCache
    function getSinCache(_num) {
        _num = numFix(numMod(_num, PI_2));
        if (sinCache[_num] == undefined) sinCache[_num] = sin(_num);
        return sinCache[_num];
    }

    /**
     * 更新asin
     * @param _num
     * @returns {*}
     */
    function getAsinCache(_num) {
        //   _num= numFix(numMod(_num,PI_2));
        if (_num > 1 || _num < -1) return NaN;
        _num = numFix(_num);
        if (asinCache[_num] == undefined) asinCache[_num] = asin(_num);
        return asinCache[_num];
    }

    /**
     * 更新acos
     * @param _num
     * @returns {*}
     */
    function getAcosCache(_num) {
        if (_num > 1 || _num < -1) return NaN;
        _num = numFix(_num);
        if (acosCache[_num] == undefined) acosCache[_num] = acos(_num);
        return acosCache[_num];
    }

    /**
     * 更新atan
     * @param _num
     * @returns {*}
     */
    function getAtanCache(_num) {
        _num = numFix(_num);
        if (atanCache[_num] == undefined) atanCache[_num] = atan(_num);
        return atanCache[_num];
    }


    ///////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////
    /*
     * 判断数值在误差范围内是否为0
     * @para:_num,拟判定的数值
     *
     * return false|true
     * */
    function isZero(_val, _ep) {
        //if(!_ep)_ep=EP;
        _ep = _ep || EP;
        return abs(_val) < _ep;
    }


    function isUglyPoint(point) {
        return !point || !isFinite(point.x) || !isFinite(point.y) || !isFinite(point.z)
    }

    function isUglyLine(line) {
        return isUglyPoint(line.sp) || isUglyPoint(line.ep)
    }

    function pointEqualPoint(point1, point2) {
        return isZeroVector([point1.x - point2.x, point1.y - point2.y, point1.z - point2.z])
    }

    function isLineEqualLine(line1, line2) {
        return pointEqualPoint(line1.sp, line2.sp) && pointEqualPoint(line1.ep, line2.ep)
    }

    function pointToVector(p) {
        return [p.x, p.y, p.z]
    }

    function vectorToPoint(v) {
        return {
            x: v[0],
            y: v[1],
            z: v[2]
        }
    }

    //判断两个非0向量是否平行
    function isParallel(_vector1, _vector) {
        var n = crossVector(_vector1, _vector);
        return isZeroVector(n);
    }

    /*
     * 求a,b两个向量的法向量或者差积
     * a×b=(a.y * b.z - a.z * b.y)i+(a.z * b.x - a.x * b.z)j+(a.x * b.y  - a.y * b.x)k,
     * @para:_vector1,三维向量
     * @para:_vector2,三维向量
     *
     * return 三维向量
     * */
    function crossVector(_vector1, _vector2) {

        return [_vector1[1] * _vector2[2] - _vector1[2] * _vector2[1],
            _vector1[2] * _vector2[0] - _vector1[0] * _vector2[2],
            _vector1[0] * _vector2[1] - _vector1[1] * _vector2[0]
        ];
    }


    function subVector(_v1, _v2, _res) {
        var obj = _res || [];
        obj[0] = _v2[0] - _v1[0];
        obj[1] = _v2[1] - _v1[1];
        obj[2] = _v2[2] - _v1[2];
        return obj;
    }

    function unitVector(_vector) {
        var norm = vectorModule(_vector);
        for (var i = 0; i < _vector.length; i++) {
            _vector[i] = _vector[i] / norm
        }
        return _vector;
    }

    /**
     * 向量加法
     * 默认res不传覆盖v2
     * @param _v1
     * @param _v2
     * @returns {*}
     */
    function addVector(_v1, _v2) {
        var obj = [];
        obj[0] = _v1[0] + _v2[0];
        obj[1] = _v1[1] + _v2[1];
        obj[2] = _v1[2] + _v2[2];

        return obj;
    }

    function kMultiplyVector(_k, _v) {

        var obj = [];
        obj[0] = _v[0] * _k;
        obj[1] = _v[1] * _k;
        obj[2] = _v[2] * _k;
        return obj;
    };


    /**
     * 计算v13=k*v12
     * @param _v
     * @param _length
     */
    function kVector(_v, _length) {

        //计算模长
        var distance = vectorModule(_v);
        //计算比例因子k
        var k = _length / distance;
        //计算k*v12
        return kMultiplyVector(k, _v);

    }


    /**
     * 计算两个向量的数量积
     *
     */
    var dotVector = function (_v1, _v2) {
        return _v1[0] * _v2[0] + _v1[1] * _v2[1] + _v1[2] * _v2[2];
    };

    /**
     * 计算向量对象的模的平方
     *
     */
    function normMnorm(_vector) {
        return _vector[0] * _vector[0] + _vector[1] * _vector[1] + _vector[2] * _vector[2]
    };

    function vectorModule(_vector) {
        return sqrt(normMnorm(_vector));
    }

    function isZeroVector(_vector) {

        for (var i = 0; i < _vector.length; i++) {
            if (!isZero(_vector[i]))
                return false;
        }
        return true;
    }

    /**
     * 判断两个向量是否共线
     * @param _v1[x1,y1,z1]
     * @param _v2[x2,y2,z2]
     * var value=x1*y2+x1*z2-x2*y1-x2*z1
     */
    function isTVectorOnLine(_v1, _v2) {
        return isZero(_v1[0] * _v2[1] - _v2[0] * _v1[1]) && isZero(_v1[1] * _v2[2] - _v2[1] * _v1[2]) && isZero(_v1[0] * _v2[2] - _v2[0] * _v1[2]);
    }

    /**计算两个向量夹角（不带方向）
     * cos(angle)=v1 。v2/(vectorModule*vectorModule)
     * @param _v1
     * @param _v2
     * @returns {*}
     */
    var angeVectors = function (_v1, _v2) {
        var value = dotVector(_v1, _v2) / (vectorModule(_v1) * vectorModule(_v2));
        //todo 此处value 计算会出现-1与1之外，近似-1或者1
        if (value < -1) return getAcosCache(-1);
        if (value > 1) return getAcosCache(1);
        return getAcosCache(value)
    };
    /**
     *计算两个向量夹角（带方向）
     * @param _v1
     * @param _v2
     * @param _normVector
     * @returns {*}
     */
    var angeInverseVectors = function (_v1, _v2, _normVector) {
        var thea = angeVectors(_v1, _v2);

        var cross = unitVector(crossVector(_v1, _v2));
        if (!isZeroVector(addVector(cross, _normVector))) {
            thea = PI_2 - thea;
        }
        return thea;
    };

    function isOnLine(p, sp, ep) {
        var v1 = [p.x, p.y, p.z],
            v2 = [sp.x, sp.y, sp.z],
            v3 = [ep.x, ep.y, ep.z];
        //首先判断p是否是sp或者ep
        var vse = subVector(v2, v3),
            vsp = subVector(v2, v1),
            vep = subVector(v3, v1);

        if (isZeroVector(vse) || isZeroVector(vsp)) {
            return true;
        } else {
            return isTVectorOnLine(vse, vsp);
        }

    }

    function justPointInSegement(startP, endP, destP) {

        if (((destP.x - startP.x).toFixed(5) > 0 && (destP.x - endP.x).toFixed(5) > 0)
            || ((destP.x - startP.x).toFixed(5) < 0 && (destP.x - endP.x).toFixed(5) < 0)
            || ((destP.y - startP.y).toFixed(5) > 0 && (destP.y - endP.y).toFixed(5) > 0)
            || ((destP.y - startP.y).toFixed(5) < 0 && (destP.y - endP.y).toFixed(5) < 0)
            || ((destP.z - startP.z).toFixed(5) > 0 && (destP.z - endP.z).toFixed(5) > 0)
            || ((destP.z - startP.z).toFixed(5) < 0 && (destP.z - endP.z).toFixed(5) < 0)) {
            return false;
        }
        return true;

    }

    //判断射线上点
    function justPointInRay(startP, endP, destP) {
        return valueOnSP_EP_Pos(startP, endP, destP) >= 0;
    }

    /**
     *求点到线的投影
     * @param _line
     * @param _p
     * @returns {*}
     */
    function projectionByLine_P(_line, _p) {
        return projectionBySP_EP_P(_line.sp, _line.ep, _p)
    }

    function projectionBySP_EP_P(_sp, _ep, _p) {
        var value = valueOnSP_EP_Pos(_sp, _ep, _p);
        return pointOnSP_EP(_sp, _ep, value)
    }

    function splane_planerotateaxis(plane, axis, angle) {
        var splane = sylPlane.create(plane.anchor, plane.normalVector);
        var aline = sylLine.create(axis.anchor, axis.direction);
        splane.rotate(angle, aline);
        return splane.rotate(angle, aline);
    }

    /**
     *求点到面的投影
     * @param p
     * @param planeAnchor
     * @param normVector
     * @returns {*}
     */
    function projectionByPP(p, planeAnchor, normVector) {
        return projectionBySplane_Pv(sylPlane.create(planeAnchor, normVector), pointToVector(p))
    }

    function projectionBySplane_Pv(splane, pv) {
        return vectorToPoint(splane.pointClosestTo(pv).elements)
    }

    function pointClosest_sLine_sLine(sLine1, sLine2) {
        return vectorToPoint(sLine1.pointClosestTo(sLine2).elements)
    }


    /**
     * 计算线和面的交点
     * @param syLine
     * @param syPlane
     * @returns {*}
     */
    function projectionBySPP(syLine, syPlane) {

        var point = syPlane.intersectionWith(syLine);
        if (point) return vectorToPoint(point.elements);
        return null;
    }

    //计算圆的起始向量
    function calculateCircleInitVector(circle) {
        var start = pointOnCircle(circle, 0);
        return subVector(pointToVector(circle.centre), pointToVector(start))
    }


    /**
     * 根据点值计算线上的位置
     * @param line
     * @param value
     * @returns {{x: *, y: *, z: *}}
     */
    function pointOnLine(line, value) {
        var sp = line.sp, ep = line.ep;
        return {
            x: (ep.x - sp.x) * value + sp.x,
            y: (ep.y - sp.y) * value + sp.y,
            z: (ep.z - sp.z) * value + sp.z
        }
    }


    function pointOnSP_EP(sp, ep, value) {
        return {
            x: (ep.x - sp.x) * value + sp.x,
            y: (ep.y - sp.y) * value + sp.y,
            z: (ep.z - sp.z) * value + sp.z
        }
    }

    /**
     * 根据位置计算线上的点值
     * @param line
     * @param pos
     * @returns {number}
     */
    function valueOnLine(line, pos) {
        return valueOnSP_EP_Pos(line.sp, line.ep, pos)
    }


    function valueOnSP_EP_Pos(sp, ep, pos) {
        var v1 = pointToVector(sp),
            v2 = pointToVector(ep),
            v3 = pointToVector(pos);
        var v13 = subVector(v1, v3);
        var v12 = subVector(v1, v2);


        var mV = dotVector(v13, v12);
        //(|P2 - P1| * |P2 - P1|)
        var norm = normMnorm(v12);
        return mV / norm;
    }


    function valueOnCircle(circle, _pos, _initVector) {
        var projection = projectionByPP(_pos, pointToVector(circle.centre), circle.normalVector);
        if (!_initVector) _initVector = calculateCircleInitVector(circle);
        var thea = angeInverseVectors(subVector(pointToVector(circle.centre), pointToVector(projection)), _initVector, circle.normalVector);
        thea = thea % PI_2;
        return thea;
    }

    function pointOnCircle(circle, _value, vetiVector) {
        var centre = circle.centre,
            radius = circle.radius,
            normVector = circle.normalVector;

        if (!vetiVector) vetiVector = planeVector(normVector);
        var vector_a = vetiVector.a,
            vector_b = vetiVector.b;
        var val1 = radius * getCosCache(_value),
            val2 = radius * getSinCache(_value);
        return {
            x: centre.x + vector_a[0] * val1 + vector_b[0] * val2,
            y: centre.y + vector_a[1] * val1 + vector_b[1] * val2,
            z: centre.z + vector_a[2] * val1 + vector_b[2] * val2
        };
    }

    function pointoncircle_centre_radius_vetivector_value(centre, radius, vetiVector, _value) {
        var vector_a = vetiVector.a,
            vector_b = vetiVector.b;
        var val1 = radius * getCosCache(_value),
            val2 = radius * getSinCache(_value);
        return {
            x: centre.x + vector_a[0] * val1 + vector_b[0] * val2,
            y: centre.y + vector_a[1] * val1 + vector_b[1] * val2,
            z: centre.z + vector_a[2] * val1 + vector_b[2] * val2
        };
    }


    function valueOnPlane(_plane, _pos) {
        var projection = projectionBySplane_Pv(_plane.sylplane, pointToVector(_pos));
        var axis = _plane.axis;
        return {
            dx: valueOnLine(axis.x, projection),
            dy: valueOnLine(axis.y, projection)
        }
    }

    function pointOnPlane(plane, dxy) {
        var axis = plane.axis;

        var xp = pointOnLine(axis.x, dxy.dx),
            yp = pointOnLine(axis.y, dxy.dy);

        var syl1 = sylLine.create(pointToVector(xp), axis.y.v),
            syl2 = sylLine.create(pointToVector(yp), axis.x.v);

        return intersectionPointBySLL(syl1, syl2);
    }


    //判断一个点是否在一个多边形内部
    function isPointInPolygon(polygon, point) {
        var sylines = polygon.sylLines,
            sylplane = polygon.sylplane,
            vertices = polygon.vertices;
        var sp = point,
            ep = polygon.centre;
        var direction = subVector(pointToVector(sp), pointToVector(ep));
        if (isZeroVector(direction)) {
            ep = {x: ep.x + 0.1, y: ep.y + 0.2, z: ep.z + 0.1};

            direction = subVector(
                pointToVector(sp),
                sylplane.pointClosestTo(sylVector.create(pointToVector(ep))).elements)
        }
        var line = sylLine.create(pointToVector(sp), direction);
        var count = 0;
        var start, end;
        for (var i = 0; i < sylines.length; i++) {
            var inte = intersectionPointBySLL(line, sylines[i]);
            if (inte) {
                start = vertices[i];
                end = vertices[i + 1];
                if (justPointInRay(sp, ep, inte) && justPointInSegement(start, end, inte)) {
                    count++;
                }
            }
        }
        //如果交点数为奇数则在多边形内，反之在多边形外！
        return count % 2;
    }


    /**
     * 点集的长度，在每个样本点中，添加一个length属性，表示从该点到起点的长度
     * @alias module:geometry2.length_of_path
     * @param _points
     * @returns {*}
     */
    function length_of_path(_points) {

        var length_1 = _points.length - 1;
        _points[0].length = 0;

        if (length_1 < 1) return _points;
        for (var i = 0; i < length_1; i++) {
            _points[i + 1].length = _points[i].length + distance(_points[i], _points[i + 1])
        }
        return _points;
    }


    /**
     * 二维点集的长度；及多段path组成的paths（一般用于函数曲线、轨迹等需要分段的曲线）
     * @alias module:geometry2.length_of_paths
     * @param _paths
     * @returns {*}
     */
    function length_of_paths(_paths) {

        var paths_length = _paths.length;
        if (paths_length == 0) return _paths;
        //计算第一段path
        length_of_path(_paths[0]);

        if (paths_length == 1) return _paths;

        var lastPath = _paths[0];
        //从第二段开始计算
        for (var i = 1; i < paths_length; i++) {

            var path = _paths[i], path_length = path.length;

            path[0].length = lastPath[lastPath.length - 1].length;
            lastPath = path;
            if (path_length < 2) continue; // 如果当前样本点数量小于2，则跳过

            for (var j = 1; j < path_length; j++) {
                path[j].length = path[j - 1].length + distance(path[j - 1], path[j]);
            }
        }

        return _paths;
    }


    /**
     * 返回 point 到_sp 和 _ep之间的最近点
     *      1、如果point到线段的垂足在线内，则返回垂足；
     *      2、否则，则返回离_point最近的端点
     * @alias module:geometry2.nearest_of_Segment
     * @param _sp
     * @param _ep
     * @param _point
     */
    function nearest_of_Segment(_sp, _ep, _point) {

        var foot = projectionBySP_EP_P(_sp, _ep, _point);

        if (justPointInSegement(_sp, _ep, foot)) return foot;

        //因为只需要比较大小，所以只需要计算距离的平方即可；省去一次开方运算
        var s_distance = square_distance(_sp, _point),
            e_distance = square_distance(_ep, _point);

        return s_distance < e_distance ? _sp : _ep;
    }

    /**
     * 计算点在path上的值，算法：
     *      1、找到_point 到 path的上的最近点nearest_point
     *      2、计算path的总长度： totalLength
     *      3、计算nearest_point 到path的起点的长度
     *      4、将3中的长度，除以totalLength，得到的比值，即为点在path上的值
     * @alias module:geometry2.value_on_path
     * @param _points
     * @param _point
     * @param [_totalLength]  [为了提高效率，有时直接传入]
     *
     */
    function value_on_path(_points, _point, _totalLength) {


        if (!_totalLength) {

            var path_length = length_of_path(_points);
            _totalLength = path_length[path_length.length - 1].length;
        }


        var length_1 = _points.length - 1;

        var min_distance = Infinity, nearest_point, last_point;

        //找到最近点
        for (var i = 0; i < length_1; i++) {

            var nearest_point_00 = nearest_of_Segment(_points[i], _points[i + 1], _point),
                current_distance = square_distance(_point, nearest_point_00);

            if (current_distance > min_distance) continue;

            min_distance = current_distance;
            nearest_point = nearest_point_00;
            last_point = _points[i];
        }
        return (last_point.length + distance(nearest_point, last_point)) / _totalLength;
    }

    /**
     * 计算点 _points 在多段曲线（点集）上的的值
     * @alias module:geometry2.value_on_paths
     * @param _paths
     * @param _point
     * @param [totalLength]
     * @returns {number}
     */
    function value_on_paths(_paths, _point, totalLength) {

        if (totalLength == undefined) {
            //计算多段曲线的长度
            length_of_paths(_paths);
            var lastPath = _paths[_paths.length - 1];
            totalLength = lastPath[lastPath.length - 1].length;
        }


        var min_distance = Infinity, nearest_point, last_point;

        //找到多段曲线中，离_point 最近的点 nearest_point  last_point为nearest_point所在小线段的起点
        for (var i = 0; i < _paths.length; i++) {
            var path = _paths[i], path_length_1 = path.length - 1;

            for (var j = 0; j < path_length_1; j++) {
                var nearest_point_00 = nearest_of_Segment(path[j], path[j + 1], _point),
                    current_distance = square_distance(_point, nearest_point_00);

                if (current_distance > min_distance) continue;

                min_distance = current_distance;
                nearest_point = nearest_point_00;
                last_point = path[j];
            }
        }

        var temp_distance = distance(nearest_point, last_point);
        return (last_point.length + temp_distance) / totalLength;
    }

    /**
     * 根据value计算二维点集上的某个点
     * @alias module:geometry2.point_on_paths
     * @param _pointsArr  二维点集
     * @param _value （0到1）
     * @param _totalLength  二维点集总长度
     * @returns {{x: *, y: *}}
     */
    function point_on_paths(_pointsArr, _value, _totalLength) {

        var mm1 = 0, pos1, pos2, inputs = _pointsArr,
            totalLength = _totalLength;

        //判断该点在哪两个点之间
        var pathNum = null, pointNum = null;
        var jumpOut = false;


        for (var i = 0; i < inputs.length; i++) {

            var singlePointArr = inputs[i];

            for (var j = 0; j < singlePointArr.length - 1; j++) {

                pos1 = singlePointArr[j];
                pos2 = singlePointArr[j + 1];


                mm1 += distance(pos1, pos2);

                if ((mm1 / totalLength) >= _value) {

                    pathNum = i;
                    pointNum = j;
                    jumpOut = true;
                    break;
                }
            }
            if (jumpOut) break;

        }

        if (pathNum == null || pointNum == null) return;//解决d=1时 点出现在曲线外的问题
        //遗留问题 tan(x)上的点为跑到尽头f

        //计算当前点之前的线段的长度
        //var lastPath  = inputs[inputs.length-1];
        var mm2 = inputs[pathNum][pointNum].length;

        pos1 = inputs[pathNum][pointNum];
        pos2 = inputs[pathNum][pointNum + 1];

        var t = (totalLength * _value - mm2) / distance(pos1, pos2);

        var desPos = pointOnSP_EP(pos1, pos2, t);
        desPos.posRelation = {
            pathNum: pathNum,
            sIndex: pointNum,
            eIndex: pointNum + 1
        };
        return desPos;
    }

    /**
     * 根据点值求一维曲线的点
     * @alias module:geometry2.point_on_path
     * @param _pointsArr
     * @param _value
     * @param _totalLength
     * @returns {{x: *, y: *}}
     */
    function point_on_path(_pointsArr, _value, _totalLength) {
        var mm1 = 0, pNum = 0, pos1, pos2, inputs = _pointsArr,
            totalLength = _totalLength;

        for (var i = 0; i < inputs.length; i++) {
            if (i == inputs.length - 1) {
                pos1 = inputs[0];
                pos2 = inputs[inputs.length - 1]
            } else {
                pos1 = inputs[i];
                pos2 = inputs[i + 1]
            }

            mm1 = mm1 + distance(pos1, pos2);
            if ((mm1 / totalLength) >= _value) {
                pNum = i;
                break;
            }
        }

        //计算当前点之前的边的长度
        var mm2 = inputs[pNum].length;

        if (pNum == inputs.length - 1) {
            pos1 = inputs[pNum];
            pos2 = inputs[0]
        } else {
            pos1 = inputs[pNum];
            pos2 = inputs[pNum + 1]
        }


        var t = (totalLength * _value - mm2) / distance(pos1, pos2);

        return pointOnSP_EP(pos1, pos2, t);
    }

    /*
     *已知圆心、法向、半径计算圆上的样本点：
     * @para:_centre,圆心坐标，是一个三维坐标
     * @para:_normalVector,三维法向
     * @para:_radius,半径值
     * @para:_pointNum,拟计算的样本点数量
     * */
    function pointsOnCircle(circle, _pointNum, vetiVector, corner) {
        var thetas = getThetasCache(_pointNum);
        var points = [];
        thetas.forEach(function (item, index, _arr) {
            points.push(pointOnCircle(circle, item + corner, vetiVector))
        });
        return points;
    }

    function pointsOnArc(_arc, _pointNum, _vetiVector, corner) {
        var sAngle = _arc.sAngle,
            eAngle = _arc.eAngle;
        var thetas = getArcThea(_pointNum, sAngle, eAngle);
        var points = [];
        thetas.forEach(function (item, index, _arr) {
            points.push(pointOnCircle(_arc, item + corner, _vetiVector))
        });
        return points;
    }


    function planeVector(_normalVector) {
        unitVector(_normalVector);
        var vector_a = crossVector(_normalVector, vector3_x);

        if (isZeroVector(vector_a)) {//如果vector_a是零向量
            vector_a = crossVector(_normalVector, vector3_y);
        }

        var vector_b = crossVector(_normalVector, vector_a);

        return {
            a: unitVector(vector_a),
            b: unitVector(vector_b)
        }
    }

    function midPointByPoints(p1, p2) {
        return {
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2,
            z: (p1.z + p2.z) / 2
        };
    }

    function minus(p, center) {
        return {
            x: center.x * 2 - p.x,
            y: center.y * 2 - p.y,
            z: center.z * 2 - p.z
        };
    }


    /**
     *
     * @param syline1
     * @param syline2
     * @param a
     * @param b
     * @param [,_norm]
     */
    function vetiInte(syline1, syline2, a, b, _norm) {

        if (isZero(_norm)) return {x: NaN, y: NaN, z: NaN};
        var axis1 = sylLine.create(a, _norm),
            axis2 = sylLine.create(b, _norm);
        var veti1 = syline1.rotate(halfPI, axis1),
            veti2 = syline2.rotate(halfPI, axis2);
        return intersectionPointBySLL(veti1, veti2);
    }

    function paichi(as, ae, bs, be)//快速排斥，若通过快速排斥进行跨立实验，否则无交点；
    {
        var mAx = max(ae.x, as.x), mIn = min(bs.x, be.x);
        if ((mAx < mIn) && !isZero(mAx - mIn)) return 0;
        mAx = max(bs.x, be.x);
        mIn = min(as.x, ae.x);
        if ((mAx < mIn) && !isZero(mAx - mIn)) return 0;
        mAx = max(as.y, ae.y);
        mIn = min(bs.y, be.y);
        if ((mAx < mIn) && !isZero(mAx - mIn)) return 0;
        mAx = max(bs.y, be.y);
        mIn = min(as.y, ae.y);
        if ((mAx < mIn) && !isZero(mAx - mIn)) return 0;
        mAx = max(as.z, ae.z);
        mIn = min(bs.z, be.z);
        if ((mAx < mIn) && !isZero(mAx - mIn)) return 0;
        mAx = max(bs.z, be.z);
        mIn = min(as.z, ae.z);
        if ((mAx < mIn) && !isZero(mAx - mIn)) return 0;
        return 1;
    }


    function isSegments_has_intersection(A, B, C, D) {
        //目前制作快速排斥
        return paichi(A, B, C, D)
    }

    function intersectionOfSegments(A, B, C, D) {

        if ((isZero(A.x - B.x) && isZero(A.y - B.y) && isZero(A.z - B.z))
            || (isZero(C.x - D.x) && isZero(C.y - D.y) && isZero(C.z - D.z))) return;
        //如果两个线段不相交，返回false
        if (!isSegments_has_intersection(A, B, C, D)) return;

        //构造两个线的系数；
        var point = intersection_spep_spep(A, B, C, D);
        //继续排出不满足条件点(快速排斥不一定能排斥完)
        if (point && justPointInSegement(A, B, point) && justPointInSegement(C, D, point)) return point;
    }

    /**
     * 计算一个线段与一个path(点集)的交点集
     * @alias module:geometry2.intersections_Segment_Path
     * @param A 线段的起点
     * @param B 线段的终点
     * @param _path 点集
     * @param _intersection_arr 接收交点的交点集数组
     * @returns {*}
     */
    function intersections_Segment_Path(A, B, _path, _intersection_arr) {
        _intersection_arr = _intersection_arr || [];
        var length_1 = _path.length - 1;
        for (var i = 0; i < length_1; i++) {
            var pos = intersectionOfSegments(A, B, _path[i], _path[i + 1]);
            if (pos) _intersection_arr.push(pos);
        }
        return _intersection_arr;
    };


    /**
     * 计算一个线段与一个paths(多段点集)的交点集
     * @alias module:geometry2.intersections_Segment_Paths
     * @param A 线段的起点
     * @param B 线段的终点
     * @param _paths
     * @param _intersection_arr
     */
    function intersections_Segment_Paths(A, B, _paths, _intersection_arr) {
        _intersection_arr = _intersection_arr || [];
        for (var i = 0; i < _paths.length; i++) {
            intersections_Segment_Path(A, B, _paths[i], _intersection_arr);
        }
        return _intersection_arr;
    }

    /**
     * 返回 path(点集) 与 path(点集) 的交点集
     * @alias module:geometry2.intersections_path_path
     * @param _points_1
     * @param _points_2
     * @param _intersection_arr
     * @returns {*|Array}
     */
    function intersections_path_path(_points_1, _points_2, _intersection_arr) {
        _intersection_arr = _intersection_arr || [];
        var length_1 = _points_1.length - 1;
        for (var i = 0; i < length_1; i++) {
            intersections_Segment_Path(_points_1[i], _points_1[i + 1], _points_2, _intersection_arr);
        }
        return unique(_intersection_arr)
    }


    /**
     * 返回 path(以为点集) 与 paths(二维点集) 的交点集
     * @alias module:geometry2.intersections_path_paths
     * @param _points_1
     * @param _paths
     * @param _intersection_arr
     * @returns {*|Array}
     */
    function intersections_path_paths(_points_1, _paths, _intersection_arr) {
        _intersection_arr = _intersection_arr || [];

        for (var i = 0; i < _paths.length; i++) {
            _intersection_arr = _intersection_arr.concat(intersections_path_path(_points_1, _paths[i]))
        }
        return unique(_intersection_arr)
    }

    /**
     * 返回 多段点集 与 多段点集 的交点集
     * @alias module:geometry2.intersections_paths_paths
     * @param _paths_1
     * @param _paths_2
     * @param _intersection_arr
     * @returns {*|Array}
     */
    function intersections_paths_paths(_paths_1, _paths_2, _intersection_arr) {
        _intersection_arr = _intersection_arr || [];
        for (var i = 0; i < _paths_1.length; i++) {
            var segments1 = _paths_1[i];
            for (var j = 0; j < _paths_2.length; j++) {
                intersections_path_path(segments1, _paths_2[j], _intersection_arr);
            }
        }
        return unique(_intersection_arr)
    }

    function intersection_spep_spep(sp1, ep1, sp2, ep2) {
        var syl1 = sylLine.create(pointToVector(sp1), [ep1.x - sp1.x, ep1.y - sp1.y, ep1.z - sp1.z]);
        var syl2 = sylLine.create(pointToVector(sp2), [ep2.x - sp2.x, ep2.y - sp2.y, ep2.z - sp2.z]);
        return intersectionPointBySLL(syl1, syl2);
    }

    function intersection_line_line(line1, line2) {
        return intersection_spep_spep(line1.sp, line1.ep, line2.sp, line2.ep);
    }


    /**
     * 返回 线段 与 直线（CD）的交点，如果交点不存在或交点不在线段内，则返回null
     * @alias module:geometry2.intersections_Segment_lineCos
     * @param A
     * @param B
     * @param C
     * @param D
     * @returns {*}
     */
    function intersections_Segment_line(A, B, C, D) {
        if ((isZero(A.x - B.x) && isZero(A.y - B.y) && isZero(A.z - B.z))
            || (isZero(C.x - D.x) && isZero(C.y - D.y) && isZero(C.z - D.z))) return;
        //如果两个线段不相交，返回false
        // if (!isSegments_has_intersection(A, B, C, D))return;

        //构造两个线的系数；
        var point = intersection_spep_spep(A, B, C, D);
        //继续排出不满足条件点(快速排斥不一定能排斥完)
        if (point && justPointInSegement(A, B, point)) return point;

    }


    /**
     * 返回 _path(点集) 与 直线（系数） 的交点集
     * @alias module:geometry2.intersections_lineCos_path
     * @param A
     * @param B
     * @param _path
     * @param _intersection_arr
     */
    function intersections_line_path(A, B, _path, _intersection_arr) {
        _intersection_arr = _intersection_arr || [];
        var length_1 = _path.length - 1;
        for (var i = 0; i < length_1; i++) {
            var intersection = intersections_Segment_line(_path[i], _path[i + 1], A, B);
            if (intersection) _intersection_arr.push(intersection);
        }
        return unique(_intersection_arr);
    }

    /**
     * 返回 _paths(多段线段) 与 直线（系数） 的交点集
     * @alias module:geometry2.intersections_lineCos_paths
     * @param A
     * @param B
     * @param _paths
     * @param _intersection_arr
     */
    function intersections_line_paths(A, B, _paths, _intersection_arr) {
        _intersection_arr = _intersection_arr || [];
        for (var i = 0; i < _paths.length; i++) {
            intersections_line_path(A, B, _paths[i], _intersection_arr);
        }
        _intersection_arr = unique(_intersection_arr);
        return unique(_intersection_arr);
    }


    // 借用第三方库(线和线)
    function intersectionPointBySLL(sObj1, sObj2) {
        if (sObj1.intersects(sObj2)) {
            var point = sObj1.intersectionWith(sObj2);
            if (point) return vectorToPoint(point.elements);
        }
        return null;
    }

    function intersection_of_line_plane(line, plane) {
        return intersectionPointBySLL(line.sylline, plane.sylplane)
    }

    function intersections_line_circle(line, circle) {
        var intersections = [];
        var sylL = line.sylline, sp = line.sp, ep = line.ep,
            centre = circle.centre, radius = circle.radius, sylP = circle.sylplane;
        //首先判断该条线是否与圆共面
        if (sylP.contains(sylL)) {
            //计算圆心到该条直线的距离
            var d = distance_PointToSP_EP(centre, sp, ep);
            if (d <= radius) intersections = intersections_line_paths(sp, ep, circle.points);
        } else {
            //计算线和面的交点
            if (sylP.intersects(sylL)) {
                var intersection = vectorToPoint(sylP.intersectionWith(sylL).elements);
                //判断这个交点是否在线上
                if (isZero(distance(intersection, centre) - radius)) intersections.push(intersection);
            }
        }
        return intersections;
    }

    function intersections_segment_circle(segment, circle) {
        var intes = [];
        var intersections = intersections_line_circle(segment, circle);
        for (var i = 0; i < intersections.length; i++) {
            if (!isUglyPoint(intersections[i]) && justPointInSegement(segment.sp, segment.ep, intersections[i])) intes.push(intersections[i]);
        }
        return intes;
    }

    /**
     * 圆或者弧与一维点集的交点集合
     * @alias module:geometry2.intersection_of_circle_path
     * @param _circle
     * @param path
     * @returns {Array}
     */
    function intersection_of_circle_path(_circle, path) {
        var points = [];
        for (var i = 0; i < path.length - 1; i++) {
            var sp = path[i],
                ep = path[i + 1];
            var v = [ep.x - sp.x, ep.y - sp.y, ep.z - sp.z];
            if (isZeroVector(v)) continue;
            var ps = intersections_segment_circle(_circle, {
                sp: sp,
                ep: ep,
                sylline: sylLine.create(pointToVector(sp), v)
            });
            points = points.concat(ps);
        }
        return unique(points);
    }

    /**
     * 圆或者弧与二维点集的交点集合
     * @alias module:geometry2.intersection_of_circle_paths
     * @param _circle
     * @param paths
     * @returns {Array}
     */
    function intersection_of_circle_paths(_circle, paths) {
        var points = [];
        for (var i = 0; i < paths.length; i++) {
            points = points.concat(intersection_of_circle_path(_circle, paths[i]))
        }
        return unique(points);
    }


    function intersection_of_circle_circle(_circle1, _circle2) {
        var intersections = [];
        var centre1 = _circle1.centre,
            radius1 = _circle1.radius,
            sylP1 = _circle1.sylplane,
            centre2 = _circle2.centre,
            radius2 = _circle2.radius,
            sylP2 = _circle2.sylplane;

        //判断是否共面

        if (sylP1.eql(sylP2)) {
            //计算两个圆心的距离
            var disCC = distance(centre1, centre2);
            if (disCC <= (radius1 + radius2) && disCC >= abs((radius1 - radius2))) intersections = intersections_paths_paths(_circle1.points, _circle2.points)
        } else {
            //计算两个面的交线
            if (sylP1.intersects(sylP2)) {
                var sline = sylP1.intersectionWith(sylP2);
                var direction = sline.direction.elements;
                var sp = vectorToPoint(sline.anchor.elements),
                    ep = {x: sp.x + direction[0], y: sp.y + direction[1], z: sp.z + direction[2]};
                //计算圆心到线的距离
                if ((distance_PointToSP_EP(centre1, sp, ep)) <= radius1 && distance_PointToSP_EP(centre2, sp, ep) <= radius2)
                //计算交线 和圆的交点
                    intersections = intersections_line_paths(sp, ep, _circle1.points);
            }
        }
        return intersections;
    }


    function intersections_of_circle_plane(circle, plane) {
        var intersections = [];

        //计算面和圆的交点
        var centre1 = circle.centre,
            radius1 = circle.radius,
            sylP1 = circle.sylplane,
            sylP2 = plane.sylplane;
        if (!sylP1.eql(sylP2)) {
            var sline = sylP1.intersectionWith(sylP2);
            var sp = vectorToPoint(sline.anchor.elements),
                direction = sline.direction.elements,
                ep = {x: sp.x + direction[0], y: sp.y + direction[1], z: sp.z + direction[2]};
            if (distance_PointToSP_EP(centre1, sp, ep) <= radius1) intersections = intersections_line_paths(sp, ep, circle.points)
            if (intersections.length == 2) {
                var v = [intersections[1].x - intersections[0].x, intersections[1].y - intersections[0].y, intersections[1].z - intersections[0].z]
                if (isSameDirection(direction, v)) intersections.reverse();

            }
        }
        return intersections;

    }


    function isSameDirection(direction1, direction2) {
        return (isZeroVector(addVector(unitVector(direction1), unitVector(direction2))))
    }

    function intersection_of_paths_surface(paths, surface) {
        var points = [];
        for (var i = 0, path; path = paths[i]; i++) {
            points = points.concat(intersection_of_path_surface(path, surface))
        }
        return unique(points);
    }

    function intersection_of_path_surface(path, surface) {
        var points = [];
        for (var i = 0; i < path.length - 1; i++) {
            points = points.concat(intersectopm_of_segmentspep_surface(path[i], path[i + 1], surface))
        }
        return unique(points);
    }

    function intersectopm_of_segmentspep_surface(sp, ep, surface) {
        var intes = intersection_of_spep_surface(sp, ep, surface);
        var intersection = [];
        for (var i = 0; i < intes.length; i++) {
            if (justPointInSegement(sp, ep, intes[i])) intersection.push(intes[i])
        }
        return intersection;
    }

    function intersection_of_spep_surface(sp, ep, surface) {
        var sv = pointToVector(sp), ev = pointToVector(ep), pdirect = subVector(sv, ev), ndirect = subVector(ev, sv);

        var grid_mesh = surface.grid_mesh;
        var vertices = grid_mesh.vertices,
            vplanes = grid_mesh.vplanes;

        var intesections = [], inte;
        for (var i = 0, plane; plane = vplanes[i]; i++) {
            var v0 = pointToVector(vertices[plane[0]]),
                v1 = pointToVector(vertices[plane[1]]),
                v2 = pointToVector(vertices[plane[2]]);
            var e1 = subVector(v0, v1),
                e2 = subVector(v0, v2);

            inte = intersectTriangle_raysvdirect_traiv0e1e2(sv, pdirect, v0, e1, e2);
            if (inte) intesections.push(inte);
            inte = intersectTriangle_raysvdirect_traiv0e1e2(sv, ndirect, v0, e1, e2);
            if (inte) intesections.push(inte);
        }
        return unique(intesections);
    }

    function intersection_of_line_surface(line, surface) {
        return intersection_of_spep_surface(line.sp, line.ep, surface);
    }


    //判断  射线与三角面  存在返回交点，不存在，返回false

    function intersectTriangle_raysvdirect_traiv0e1e2(sv, direct, v0, e1, e2) {
        var v, tt, u;

        var p = crossVector(direct, e2);

        var det = dotVector(e1, p);

        var t;

        if (det > 0) t = subVector(v0, sv);
        else {
            t = subVector(sv, v0);
            det = -det;
        }
        if (det < 0.0001) return false;

        u = dotVector(t, p);
        if (u < 0 || u > det) return false

        var q = crossVector(t, e1)

        v = dotVector(direct, q);
        if (v < 0 || u + v > det) return false;

        tt = dotVector(e2, q);

        var fInvDet = 1 / det;


        return vectorToPoint(addVector(sv, kMultiplyVector(tt * fInvDet, direct)))
    }


    function intersectTriangle_ray_traiangle(ray, traiangle) {
        var sv = pointToVector(ray.sp),
            direct = ray.direction;
        var v0 = pointToVector(traiangle[0]),
            v1 = pointToVector(traiangle[1]),
            v2 = pointToVector(traiangle[2]);

        var e1 = subVector(v0, v1),
            e2 = subVector(v0, v2);
        return intersectTriangle_raysvdirect_traiv0e1e2(sv, direct, v0, e1, e2);
    }


    /**
     * 排除重复ugly点
     * @alias module:geometry2.unique
     * @param points
     */
    function unique(points) {
        if (points.length <= 1) return points;
        var result = [], isRepeated; //一个新的临时数组
        //遍历当前数组
        for (var i = 0, point; point = points[i]; i++) {
            isRepeated = false;
            if (isUglyPoint(point)) continue;
            for (var j = 0, rp; rp = result[j]; j++) {
                if (isZeroVector([rp.x - point.x, rp.y - point.y, rp.z - point.z])) {
                    isRepeated = true;
                    break;
                }
            }
            if (!isRepeated) result.push(point);
        }
        return result;
    }

    function isPointEqualPoint(p1, p2) {
        return isZero(p1.x - p2.x) && isZero(p1.y - p2.y) && isZero(p1.z - p2.z)
    }


    /**
     * 求点到圆的切线
     * @alias module:geometry2.Tangent_Point_Circle
     * @param pos
     * @param circle
     * @returns {Array}
     *
     */
    function tangent_Point_Circle(pos, circle) {
        var centre = circle.centre,
            radius = circle.radius;

        if (isZero(radius - distance(pos, centre), 0.0005)) {
            var tang = tangent_Point_onCircle(circle, pos);
            return [tang, tang]
        }
        if (radius - distance(pos, centre) > 0)
            return [
                {sp: {x: NaN, y: NaN, z: NaN}, ep: {x: NaN, y: NaN, z: NaN}},
                {sp: {x: NaN, y: NaN, z: NaN}, ep: {x: NaN, y: NaN, z: NaN}}
            ]
        return tangent_Point_outCircle(circle, pos)


    }


    /**
     * 计算点在圆上的切线(一条)
     * @alias module:geometry2.Tangent_Point_onCircle
     * @param circle
     * @param pos
     * @returns {{sp: *, ep: ({x, y}|{x: *, y: *})}}
     */
    function tangent_Point_onCircle(circle, pos) {
        var ep = rotateSvtToSAxis(
            sylVector.create(pointToVector(circle.centre)),
            sylLine.create(pointToVector(pos), circle.normalVector),
            halfPI
        );
        return {
            sp: pos,
            ep: ep
        }
    }


    /**
     * 计算点在圆外切线(两条)
     * @alias module:geometry2.Tangent_Point_outCircle
     * @param circle
     * @param pos
     * @returns {Array}

     */
    function tangent_Point_outCircle(circle, pos) {
        //采用几何方法计算
        var centre = circle.centre, r = circle.radius;
        var pC = distance(centre, pos);
        //计算夹角
        var angle = asin(r / pC);

        var svt = sylVector.create(pointToVector(circle.centre));
        var sAxis = sylLine.create(pointToVector(pos), circle.normalVector);

        var ep1 = rotateSvtToSAxis(svt, sAxis, angle),
            ep2 = rotateSvtToSAxis(svt, sAxis, -angle);
        return [
            {
                sp: pos,
                ep: ep1
            },
            {
                sp: pos,
                ep: ep2
            }
        ]


    }

    //根据点集和位置关系 计算切线
    function tangentOnCurve(pos, posRelation, pointsArr) {
        var points = pointsArr[posRelation.pathNum];
        var sp = points[posRelation.sIndex],
            ep = points[posRelation.eIndex];

        var next, mid, vetiline;
        if (isPointEqualPoint(sp, pos)) {
            next = points[posRelation.sIndex - 1];
            if (next) return Interpolation(pos, next, sp, ep);

            mid = midPointByPoints(sp, ep);
            vetiline = vertiLine_point_line(mid, {sp: sp, ep: ep}, 0);
            next = centrosymmetric_point(
                points[posRelation.eIndex + 1],
                pointClosestToLine(
                    points[posRelation.eIndex + 1],
                    vetiline
                )
            );
            return Interpolation(pos, next, sp, ep);

        }
        else {
            next = points[posRelation.eIndex + 1];
            if (next) return Interpolation(pos, sp, ep, next);

            mid = midPointByPoints(sp, ep);
            vetiline = vertiLine_point_line(mid, {sp: sp, ep: ep}, 0);
            next = centrosymmetric_point(
                points[posRelation.sIndex - 1],
                pointClosestToLine(
                    points[posRelation.sIndex - 1],
                    vetiline
                )
            );
            return Interpolation(pos, sp, ep, next);

        }


    }

    //插值法 计算 切线
    function Interpolation(pos, p1, p2, p3) {
        var vector1 = unitVector([p2.x - p1.x, p2.y - p1.y, p2.z - p1.z]),
            vector2 = unitVector([p3.x - p2.x, p3.y - p2.y, p3.z - p2.z]);
        var splitVector = addVector(vector1, vector2);
        var epv = addVector(kMultiplyVector(5, splitVector), [pos.x, pos.y, pos.z]);
        return {
            sp: pos,
            ep: vectorToPoint(epv)
        }
    }

    /**
     * 过一个点到线的垂线
     * @alias module:geometry2.vertiLine_point_line
     * @param point
     * @param line
     * @param corner
     * @returns {{sp: *, ep: {x: *, y: *}}}
     */
    function vertiLine_point_line(point, line, corner) {
        corner = corner || 0;

        var sp = line.sp, ep = line.ep, direction = line.direction || [ep.x - sp.x, ep.y - sp.y, ep.z - sp.z];
        if (justPointInSegement(sp, ep, point)) {
            var verti = planeVector(direction);
            var e = pointOnCircle({centre: point, radius: 1}, corner, verti);
            return {
                sp: point,
                ep: e,
                direction: [e.x - point.x, e.y - point.y, e.z - point.z]
            }

        } else {
            var pv = pointToVector(point),
                closep = pointClosestToLine(point, line),
                closepv = pointToVector(closep),
                closesp = sylVector.create(closepv);

            var sline = sylLine.create(pv, direction);
            var destp = closesp.rotate(corner, sline).elements;

            return {
                sp: point,
                ep: vectorToPoint(destp),
                direction: subVector(pv, destp)
            }
        }

    }

    function pointClosestToLine(point, line) {
        var value = valueOnLine(line, point);
        return pointOnLine(line, value)
    }

    /**
     * 已知三角形的三个点求三角形的外心
     * @param _p1
     * @param _p2
     * @param _p3
     * @param [_norm,]
     */
    function externalCenter(_p1, _p2, _p3, _norm) {
        var m1 = midPointByPoints(_p1, _p2),
            m2 = midPointByPoints(_p1, _p3),

            vp1 = pointToVector(_p1),
            vp2 = pointToVector(_p2),
            vp3 = pointToVector(_p3),

            v1 = subVector(vp1, vp2),
            v2 = subVector(vp1, vp3);

        var line1 = sylLine.create(vp1, v1),
            line2 = sylLine.create(vp1, v2);

        if (!_norm) _norm = crossVector(v1, v2);

        if (isZeroVector(_norm)) return _p1;
        return vetiInte(line1, line2, pointToVector(m1), pointToVector(m2), _norm);
    }


    /**
     * 计算内心
     *
     */
    function internalCenter(_p1, _p2, _p3) {
        if (isOnLine(_p1, _p2, _p3)) return [NaN, NaN, NaN]

        var p1v = pointToVector(_p1),
            p2v = pointToVector(_p2),
            p3V = pointToVector(_p3);


        var v1 = subVector(p2v, p1v),
            v2 = subVector(p2v, p3V),
            v3 = subVector(p3V, p1v),
            v4 = subVector(p3V, p2v);


        //计算夹角
        var angle1 = angeVectors(v1, v2),
            angle2 = angeVectors(v3, v4);

        var r1 = calculateRotatePoint(p2v, crossVector(v1, v2), p1v, angle1 / 2),
            r2 = calculateRotatePoint(p3V, crossVector(v3, v4), p1v, angle2 / 2);

        //计算两条角平分线的交点
        var inte = intersectionPointByLL(p2v, subVector(p2v, r1), p3V, subVector(p3V, r2));

        if (!inte) return {x: NaN, y: NaN, z: NaN}
        return inte


    }

    function gravityCenter(p1, p2, p3) {
        return {
            x: (p1.x + p2.x + p3.x) / 3,
            y: (p1.y + p2.y + p3.y) / 3,
            z: (p1.z + p2.z + p3.z) / 3
        }
    }

    function rotatePointToAxis(point, axis, angle) {
        var sylline = sylLine.create(pointToVector(axis.sp), axis.direction);
        var svt = sylVector.create(pointToVector(point));
        return rotateSvtToSAxis(svt, sylline, angle)
    }

    function rotateSvtToSAxis(svt, saxis, angle) {

        return vectorToPoint(svt.rotate(angle, saxis).elements)
    }

    function calculateRotatePoint(_anchor, _direction, _p, angle) {
        //旋转轴
        var rotateLine = sylLine.create(_anchor, _direction);
        //旋转点
        var vt = sylVector.create(_p);
        //开始旋转，得到投影点旋转后的点vr
        return vt.rotate(angle, rotateLine).elements;
    }


    function intersectionPointByLL(asp, va, bsp, vb) {
        var aline = sylLine.create(asp, va),
            bline = sylLine.create(bsp, vb);
        return intersectionPointBySLL(aline, bline);

    }

    function distance_PointToSP_EP(point, sp, ep) {
        var foot = projectionBySP_EP_P(sp, ep, point);
        return distance(point, foot);
    }

    function distance_PointToLine(point, line) {
        var foot = projectionByLine_P(line, point);
        return distance(point, foot);
    }

    function foot_PointToLine(point, line) {
        return projectionByLine_P(line, point);
    }

    function distance_line_line(line1, line2) {
        var sp1 = line1.sp, ep1 = line1.ep, direction1 = [ep1.x - sp1.x, ep1.y - sp1.y, ep1.z - sp1.z],
            sp2 = line2.sp, ep2 = line2.ep, direction2 = [ep2.x - sp2.x, ep2.y - sp2.y, ep2.z - sp2.z];


        var sline1 = sylLine.create(pointToVector(sp1), direction1),
            sline2 = sylLine.create(pointToVector(sp2), direction2);

        return sline1.distanceFrom(sline2);
    }


    function square_distance(_pos1_3, _pos2_3) {
        return pow(_pos1_3.x - _pos2_3.x, 2) + pow(_pos1_3.y - _pos2_3.y, 2) + pow(_pos1_3.z - _pos2_3.z, 2);
    }

    function distance(_pos1_3, _pos2_3) {
        return sqrt(square_distance(_pos1_3, _pos2_3));
    }

    function spherediameter_center_radius_norm(centre, radius, norm) {
        var centreV = pointToVector(centre);

        var radiusN = kMultiplyVector(radius, unitVector(norm));
        var eV = addVector(centreV, radiusN);
        var sV = addVector(centreV, kMultiplyVector(-1, radiusN));

        return {
            sp: vectorToPoint(sV),
            ep: vectorToPoint(eV)
        }
    }


    function insertVertices(vertices, point) {
        vertices.push(point);
        point.index = vertices.length - 1;
    }

    function generatePlane(centre, vertexs) {
        var vplanes = [];
        for (var m = 0; m < vertexs.length - 1; m++) {
            vplanes.push([vertexs[m + 1].index, vertexs[m].index, centre.index])
        }
        return vplanes;
    }


    //todo 整体效率待优化   计算缺口球 网格数据（如果考虑截率还需重写）
    function sphere_xynum_radius_center_norm_gap(xyNum, radius, center, norm, gapAngle, corner) {

        var vertices = [], vplanes = [], assistplanes = [], assistvertices = [[], []];

        var x = xyNum.xNum, y = xyNum.yNum, center_v = pointToVector(center), veti_vector = planeVector(norm);

        //计算反向与球的法线相同且经过球心的直径 线段

        var line = spherediameter_center_radius_norm(center, radius, norm);
        var sp = line.sp, ep = line.ep;


        //计算一个半圆弧（起点sp，终点 ep,法向量 arc_norm,法线s arc_norm_line）
        var temp_p = pointOnCircle({centre: center, radius: radius}, 0, veti_vector);
        var arc_norm = crossVector(
            [sp.x - temp_p.x, sp.y - temp_p.y, sp.z - temp_p.z],
            [ep.x - temp_p.x, ep.y - temp_p.y, ep.z - temp_p.z]
        );
        var arc_norm_line = sylLine.create(center_v, arc_norm),
            pLine = sylLine.create(center_v, norm),
            s_vector = sylVector.create([sp.x, sp.y, sp.z]);//半圆弧起点

        //利用半圆弧，分割角度，旋转,计算曲面网格

        var pointsArr = [];

        var angle = PI / (x - 1);
        pointsArr.push(clonePoint(sp, y));
        for (var i = 1, d, cC, cR, temp_v, points; i < x - 1; i++) {
            temp_v = s_vector.rotate(angle * i, arc_norm_line);
            cC = vectorToPoint(pLine.pointClosestTo(temp_v).elements); //中间圈圆心
            d = distance(center, cC);
            cR = sqrt(radius * radius - d * d); // 中间圈半径
            pointsArr.push(pointsOnArc({
                centre: cC,
                radius: cR,
                sAngle: PI_2,
                eAngle: gapAngle
            }, y, veti_vector, corner));

        }
        pointsArr.push(clonePoint(ep, y));

        //计算曲面网格顶点和边缘顶点
        for (var i = 0, points; points = pointsArr[i]; i++) {
            vertices = vertices.concat(points);
        }

        //计算网格面
        for (var i = 0; i < x - 1; i++) {
            for (var j = 0, base; j < y - 1; j++) {
                base = i * y + j;
                vplanes.push([base, y + base, base + 1]);
                vplanes.push([y + base, y + base + 1, base + 1]);
            }
        }

        /* if(gapAngle!=0){
             //需要计算缺口面
             var lastIndex=assistvertices.length-1;
             for(var i=0;i<x-1;i++){
                 assistplanes.push([i,i+1,lastIndex]);
                 assistplanes.push([i+x,i+x+1,lastIndex]);
             }
         }*/

        return {
            grid_mesh: {
                vertices: vertices,
                vplanes: vplanes,
                row: pointsArr.length,
                column: y
            }
            /*,
            assist_mesh:{
                vertices:[assistvertices],
                vplanes:assistplanes
            }*/
        }

        /*var vertexFun = getVertexsFun(gapAngle, corner);
        var isClose = (gapAngle == 0);

        var x = xyNum[0],
            y = xyNum[1],
            cv = pointToVector(center),
            vetiVector = planeVector(norm),
            //计算 方向与法向量相同 且 经过 球心的 直径 线段
            line = spherediameter_center_radius_norm(center, radius, norm),
            sp = line.sp,
            ep = line.ep;

        //计算中间圈顶点集合
        var pointsArr = [];

        //以半圆弧为基础，均匀分割半圆弧，计算中间每圈圈圆心，并计算每圈顶点
        var p = pointOnCircle({centre: center, radius: radius}, 0, vetiVector);  //计算中心圈 第一个点
        var nv = crossVector([sp.x - p.x, sp.y - p.y, sp.z - p.z], [ep.x - p.x, ep.y - p.y, ep.z - p.z]); //计算法像
        var d, cC, cR,
            sLine = sylLine.create(cv, nv),
            pLine = sylLine.create(cv, norm),
            s = sylVector.create([sp.x, sp.y, sp.z]),//半圆弧起点
            angle = PI / x;//分割角度
        for (var i = 1; i < x; i++) {
            s = s.rotate(angle, sLine);
            cC = vectorToPoint(pLine.pointClosestTo(s).elements); //中间圈圆心
            d = distance(center, cC);
            cR = sqrt(radius * radius - d * d); // 中间圈半径
            pointsArr.push(vertexFun({centre: cC, radius: cR, sAngle: PI_2, eAngle: gapAngle}, y, vetiVector, corner))
        }

        var sphere = sphere_vertex_vplane(sp, ep, pointsArr, true, isClose);
        
        //判断是否绘制内部面
        if (isDrawInSide) {
            //插入顶点
            insertVertices(sphere.vertices, center);
            var sVertexs = [sp], eVertexs = [sp];
            for (var j = 0; j < pointsArr.length; j++) {
                var aps = pointsArr[j];
                sVertexs.push(aps[0]);
                eVertexs.push(aps[aps.length - 1]);
            }
            sVertexs.push(ep);
            eVertexs.push(ep);
            sphere.vplanes = sphere.vplanes.concat(generatePlane(center, sVertexs));
            sphere.vplanes = sphere.vplanes.concat(generatePlane(center, eVertexs));
        }
        return sphere;*/

    }


    //underside 是否显示上下面
    function getShereVplanes(s, e, pointsAttr, underside, isClose) {
        var vplanes = [];
        var sPs = pointsAttr[0];
        if (underside) {
            for (var m = 0; m < sPs.length - 1; m++) {
                vplanes.push([sPs[m + 1].index, sPs[m].index, s.index])
            }
            if (isClose) {
                vplanes.push(
                    [sPs[0].index, sPs[m].index, s.index]
                )
            }
        }

        for (var j = 0; j < pointsAttr.length - 1; j++) {
            var sPoints = pointsAttr[j],
                ePoints = pointsAttr[j + 1];

            for (var m = 0; m < sPoints.length - 1; m++) {
                vplanes.push([
                    sPoints[m].index, sPoints[m + 1].index, ePoints[m + 1].index
                ]);
                vplanes.push([
                    ePoints[m + 1].index, ePoints[m].index, sPoints[m].index
                ]);
            }
            if (isClose) {
                vplanes.push([
                    sPoints[m].index, sPoints[0].index, ePoints[0].index
                ]);
                vplanes.push([
                    ePoints[0].index, ePoints[m].index, sPoints[m].index
                ])
            }
        }
        if (underside) {
            var ePs = pointsAttr[pointsAttr.length - 1];
            for (var m = 0; m < ePs.length - 1; m++) {
                vplanes.push([ePs[m].index, ePs[m + 1].index, e.index])
            }

            if (isClose) {
                vplanes.push(
                    [ePs[m].index, ePs[0].index, e.index]
                )
            }
        }

        return vplanes;
    }


    function clonePoint(point, cloneNum) {
        var points = [];
        for (var i = 0; i < cloneNum; i++) {
            points[i] = $.extend({}, point)
        }
        return points;
    }

    function sphere_vertex_vplane(sp, ep, pointsArr, underside, isClose) {
        var vertices = [];
        // 处理顶点   此处可放在上部完成,为了思路清晰，暂时没做这样处理
        insertVertices(vertices, sp);
        for (var j = 0; j < pointsArr.length; j++) {
            var aps = pointsArr[j];
            for (var m = 0; m < aps.length; m++) {
                insertVertices(vertices, aps[m]);
            }
        }
        insertVertices(vertices, ep);
        return {
            vertices: vertices,
            vplanes: getShereVplanes(sp, ep, pointsArr, underside, isClose)
        }
    }

    //todo 待优化
    function cylinder_taper_num_radius_center_height_norm(taper, num, radius, center, height, norm, gapAngle, corner) {

        var vplanes = [], vertices = [];
        norm = unitVector(norm);
        var veti_vector = planeVector(norm);
        //计算上圆
        var center_top = vectorToPoint(addVector(pointToVector(center), kMultiplyVector(height, norm))),
            radius_top = radius * taper;
        //计算网格数据
        vertices = vertices.concat(pointsOnArc({
            centre: center,
            radius: radius,
            sAngle: PI_2,
            eAngle: gapAngle
        }, num, veti_vector, corner));
        if (radius_top == 0) vertices = vertices.concat(clonePoint(center_top, num));
        else vertices = vertices.concat(pointsOnArc({
            centre: center_top,
            radius: radius_top,
            sAngle: PI_2,
            eAngle: gapAngle
        }, num, veti_vector, corner));

        //计算网格面
        for (var j = 0; j < num - 1; j++) {
            vplanes.push([j, num + j, j + 1]);
            vplanes.push([num + j, num + j + 1, j + 1]);
        }

        /* var offset=0;
         if(gapAngle!=0){
             assistvertices.push(pointsAttr[0][0],pointsAttr[1][0],center,center_top,pointsAttr[0][num-1],pointsAttr[1][num-1]);
             //需要计算缺口面
             assistplanes.push([0,1,2],[1,3,2],[2,3,4],[3,5,4]);
             offset=6;
         }
         if(underside){
             assistvertices=assistvertices.concat(pointsAttr[0]);
             assistvertices=assistvertices.concat(pointsAttr[1]);

             assistvertices.push(center_top);
             assistvertices.push(center);
             var lastIndex=assistvertices.length-1,
                 lastTwoIndex=lastIndex-1;
             for(var i=0,base1=offset,base2=offset+num;i<num-1;i++){
                 assistplanes.push([i+base1,i+base1+1,lastIndex]);
                 assistplanes.push([i+base2,i+1+base2,lastTwoIndex]);
             }
         }*/

        //todo 可能还需要返回一些，辅助绘制圆柱上的点
        vertices.push(center_top, center);
        return {
            grid_mesh: {
                vplanes: vplanes,
                vertices: vertices,
                row: 2,
                column: num
            }
        }
    }


    function tetrahedron_centre_norm_r(point1, norm, R, corner) {

        var p1v = pointToVector(point1);

        var v = unitVector(norm);
        var vertices = [];
        vertices[0] = vectorToPoint(addVector(p1v, kMultiplyVector(R, v)));
        //计算底面圆心
        var centre = vectorToPoint(addVector(p1v, kMultiplyVector(-R / 3, v))),
            r = TETCIRCLE_R * R;
        var circle = {centre: centre, radius: r};
        var vetiVector = planeVector(v);
        for (var i = 1; i <= 3; i++) {
            vertices[i] = pointOnCircle(circle, PI_2 * i / 3 + corner, vetiVector)
        }
        return vertices;

    }

    function hexahedron_centre_norm_r(point1, norm, R, corner) {

        var p1v = pointToVector(point1);


        var vertices = [];
        norm = unitVector(norm)
        //计算底面圆心
        var centre = vectorToPoint(addVector(p1v, kMultiplyVector(R / sq3, norm))),
            r = R * sq2 / sq3;
        var circle = {centre: centre, radius: r};
        var vetiVector = planeVector(norm);
        for (var i = 0; i <= 3; i++) {
            vertices[i] = pointOnCircle(circle, halfPI * i + corner, vetiVector)
        }
        for (var i = 0; i <= 3; i++) {
            vertices[4 + i] = minus(vertices[i], point1)
        }
        return vertices;

    }


    function octahedron_centre_norm_r(centre, norm, R, corner) {
        var p1v = pointToVector(centre);

        var v = unitVector(norm);
        var vertices = [];

        var circle = {centre: centre, radius: R};
        var vetiVector = planeVector(v);
        for (var i = 0; i <= 3; i++) {
            vertices[i] = pointOnCircle(circle, halfPI * i + corner, vetiVector)
        }
        vertices[4] = vectorToPoint(addVector(p1v, kMultiplyVector(R, v)));
        vertices[5] = vectorToPoint(addVector(p1v, kMultiplyVector(-R, v)));

        return vertices;

    }

    function dodecahedron_centre_norm_r_corner(centre, norm, R, corner) {

        var p1v = pointToVector(centre);
        var vetiVector = planeVector(norm);
        var vertices = [];

        var r0 = R * cos(0.91844), h0 = R * sin(0.91844),
            circle0 = {centre: vectorToPoint(addVector(p1v, kMultiplyVector(h0, norm))), radius: r0};
        for (var i = 0; i < 5; i++) {
            vertices.push(pointOnCircle(circle0, PI_2 * i / 5 + corner, vetiVector))
        }
        var r1 = R * cos(0.18871), h1 = R * sin(0.18871),
            circle1 = {centre: vectorToPoint(addVector(p1v, kMultiplyVector(h1, norm))), radius: r1};
        for (var i = 0; i < 5; i++) {
            vertices.push(pointOnCircle(circle1, PI_2 * i / 5 + corner, vetiVector))
        }
        for (var i = 0; i < 10; i++) {
            vertices[10 + i] = minus(vertices[i], centre)
        }
        return vertices;
    }

    function positiveIcosahedron_point_norm_r(centre, norm, R, corner) {
        var p1v = pointToVector(centre);

        var v = unitVector(norm);
        var vetiVector = planeVector(v);
        var vertices = [];

        //上顶点
        vertices.push(vectorToPoint(addVector(p1v, kMultiplyVector(R, v))));


        var r = R * 0.894428, h = R * 0.447211,   //内接球半径
            circle = {centre: vectorToPoint(addVector(p1v, kMultiplyVector(h, v))), radius: r};
        for (var i = 0; i < 5; i++) {
            vertices.push(pointOnCircle(circle, PI_2 * i / 5 + corner, vetiVector));
        }
        for (var i = 1; i <= 5; i++) {
            vertices.push(minus(vertices[i], centre));
        }
        //上顶点
        vertices.push(vectorToPoint(addVector(p1v, kMultiplyVector(-R, v))));
        return vertices;

    }


    //已知线的起点，一个方向向量，长度，求线段的终点
    function lineEp_sp_direction_length(_sp, _direction, _length) {
        return vectorToPoint(addVector(pointToVector(_sp), kVector(_direction, _length)));
    }


    function pointsOnRotaSurface(point, sAxis, rotaPara) {
        var points = [];
        var angle = rotaPara.angle;
        var start = angle;
        points.push($.extend({}, point));
        for (var i = 1; i < rotaPara.num - 1; i++) {
            points.push(rotate_point(point, sAxis, start));
            start = start + angle;
        }
        points.push(rotate_point(point, sAxis, rotaPara.corner));
        return points;
    }

    function translate_point(point, vector) {
        var p = {
            x: point.x + vector[0],
            y: point.y + vector[1],
            z: point.z + vector[2]
        };

        //todo 结构有问题待重构
        if (!point.data) return p;
        var destp = $.extend({}, p);
        destp.data = $.extend({}, point.data);
        destp.data.geoAttr = p;
        return destp;
    }

    function translate_line(line, vector) {
        return {
            sp: translate_point(line.sp, vector),
            ep: translate_point(line.ep, vector)
        }
    }

    function translate_path(path, vector) {
        var points = [];
        for (var i = 0, point; point = path[i]; i++) {
            points[i] = translate_point(point, vector);
        }
        return points;
    }

    function translate_paths(paths, vector) {
        var curve = [];
        for (var i = 0, path; path = paths[i]; i++) {
            curve[i] = translate_path(path, vector)
        }
        return curve;
    }

    function translate_circle(circle, vector) {
        return {
            points: translate_paths(circle.points, vector),
            normalVector: circle.normalVector,
            radius: circle.radius,
            centre: translate_point(circle.centre, vector)
        }
    }

    function translate_arc(arc, vector) {
        return {
            points: translate_paths(arc.points, vector),
            normalVector: arc.normalVector,
            radius: arc.radius,
            centre: translate_point(arc.centre, vector),
            arcAttr: arc.arcAttr
        }
    }

    function translate_plane(plane, vector) {
        return {
            grid_mesh: {
                vertices: translate_path(plane.grid_mesh.vertices, vector),
                vplanes: plane.grid_mesh.vplanes,
                row: plane.grid_mesh.row,
                column: plane.grid_mesh.column
            },
            normalVector: plane.normalVector,
            centre: translate_point(plane.centre, vector)
        }
    }

    function translate_surface(surface, vector) {
        return {
            grid_mesh: {
                vertices: translate_path(surface.grid_mesh.vertices, vector),
                vplanes: surface.grid_mesh.vplanes,
                row: surface.grid_mesh.row,
                column: surface.grid_mesh.column
            }
        }
    }

    function translate_cylinder(cylinder, vector) {
        return {
            centreTop: translate_point(cylinder.centreTop, vector),
            radiusTop: cylinder.radiusTop,
            centreBottom: translate_point(cylinder.centreBottom, vector),
            radiusBottom: cylinder.radiusBottom,
            height: cylinder.height,
            grid_mesh: {
                vertices: translate_path(cylinder.grid_mesh.vertices, vector),
                vplanes: cylinder.grid_mesh.vplanes,
                row: cylinder.grid_mesh.row,
                column: cylinder.grid_mesh.column
            }
        }
    }

    function translate_sphere(surface, vector) {

        return {
            radius: surface.radius,
            normalVector: surface.normalVector,
            centre: translate_point(surface.centre, vector),
            isGap: surface.isGap,
            grid_mesh: {
                vertices: translate_path(surface.grid_mesh.vertices, vector),
                vplanes: surface.grid_mesh.vplanes,
                row: surface.grid_mesh.row,
                column: surface.grid_mesh.column
            }
        }
    }

    function translate_polyhedron(polyhedron, vector) {
        return {
            grid_mesh: {
                vertices: translate_path(polyhedron.grid_mesh.vertices, vector),
                vplanes: polyhedron.grid_mesh.vplanes,
                row: polyhedron.grid_mesh.row,
                column: polyhedron.grid_mesh.column
            },
            edges: polyhedron.edges,
            centre: translate_point(polyhedron.centre, vector)
        }
    }

    function rotate_point(point, sAxis, angle) {
        var p = rotateSvtToSAxis(sylVector.create(pointToVector(point)), sAxis, angle);
        if (!point.data) return p;
        var destp = $.extend({}, p);
        destp.data = $.extend({}, point.data);
        destp.data.geoAttr = p;
        return destp;
    }

    function rotate_line(line, sAxis, angle) {
        return {
            sp: rotate_point(line.sp, sAxis, angle),
            ep: rotate_point(line.ep, sAxis, angle)
        }
    }

    function rotate_path(path, sAxis, angle) {
        var points = [];
        for (var i = 0, point; point = path[i]; i++) {
            points[i] = rotate_point(point, sAxis, angle);
        }
        return points;
    }

    function rotate_paths(paths, sAxis, angle) {
        var curve = [];
        for (var i = 0, path; path = paths[i]; i++) {
            curve[i] = rotate_path(path, sAxis, angle)
        }
        return curve;
    }

    function rotate_circle(circle, sAxis, angle) {

        var oc = circle.centre, on = circle.normalVector;
        var ncentre = rotate_point(oc, sAxis, angle);
        //根据normVector 计算一个特殊点
        var ndest = rotate_point({x: oc.x + on[0], y: oc.y + on[1], z: oc.z + on[2]}, sAxis, angle);
        return {
            points: rotate_paths(circle.points, sAxis, angle),
            normalVector: [ndest.x - ncentre.x, ndest.y - ncentre.y, ndest.z - ncentre.z],
            radius: circle.radius,
            centre: ncentre
        }
    }

    function rotate_arc(arc, sAxis, angle) {
        var sp = arc.sp,
            ep = arc.ep;
        var mid = point_on_arc(arc, 0.5);
        return arc_of_point_point_point(
            rotate_point(sp, sAxis, angle),
            rotate_point(mid, sAxis, angle),
            rotate_point(ep, sAxis, angle)
        )

    }

    function rotate_plane(plane, sAxis, angle) {

        var oc = plane.centre, on = plane.normalVector;
        var ncentre = rotate_point(oc, sAxis, angle);
        //根据normVector 计算一个特殊点
        var ndest = rotate_point({x: oc.x + on[0], y: oc.y + on[1], z: oc.z + on[2]}, sAxis, angle);
        return {
            grid_mesh: {
                vertices: rotate_path(plane.grid_mesh.vertices, sAxis, angle),
                vplanes: plane.grid_mesh.vplanes,
                row: plane.grid_mesh.row,
                column: plane.grid_mesh.column
            },
            normalVector: [ndest.x - ncentre.x, ndest.y - ncentre.y, ndest.z - ncentre.z],
            centre: ncentre
        }


    }

    function rotate_surface(surface, sAxis, angle) {
        return {
            grid_mesh: {
                vertices: rotate_path(surface.grid_mesh.vertices, sAxis, angle),
                vplanes: surface.grid_mesh.vplanes,
                row: surface.grid_mesh.row,
                column: surface.grid_mesh.column
            }
        }
    }

    function rotate_cylinder(cylinder, sAxis, angle) {
        return {
            centreTop: rotate_point(cylinder.centreTop, sAxis, angle),
            radiusTop: cylinder.radiusTop,
            centreBottom: rotate_point(cylinder.centreBottom, sAxis, angle),
            radiusBottom: cylinder.radiusBottom,
            height: cylinder.height,
            grid_mesh: {
                vertices: rotate_path(cylinder.grid_mesh.vertices, sAxis, angle),
                vplanes: cylinder.grid_mesh.vplanes,
                row: cylinder.grid_mesh.row,
                column: cylinder.grid_mesh.column
            }
        }
    }

    function rotate_sphere(surface, sAxis, angle) {
        var oc = surface.centre, on = surface.normalVector;
        var ncentre = rotate_point(oc, sAxis, angle);
        //根据normVector 计算一个特殊点
        var ndest = rotate_point({x: oc.x + on[0], y: oc.y + on[1], z: oc.z + on[2]}, sAxis, angle);
        return {
            centre: ncentre,
            radius: surface.radius,
            normalVector: [ndest.x - ncentre.x, ndest.y - ncentre.y, ndest.z - ncentre.z],
            isGap: surface.isGap,
            grid_mesh: {
                vertices: rotate_path(surface.grid_mesh.vertices, sAxis, angle),
                vplanes: surface.grid_mesh.vplanes,
                row: surface.grid_mesh.row,
                column: surface.grid_mesh.column
            }
        }
    }

    function rotate_polyhedron(polyhedron, sAxis, angle) {
        return {
            grid_mesh: {
                vertices: rotate_path(polyhedron.grid_mesh.vertices, sAxis, angle),
                vplanes: polyhedron.grid_mesh.vplanes,
                row: polyhedron.grid_mesh.row,
                column: polyhedron.grid_mesh.column
            },
            edges: polyhedron.edges,
            centre: rotate_point(polyhedron.centre, sAxis, angle)
        }
    }


    function centrosymmetric_point(destPoint, centre) {
        var p = {
            x: centre.x * 2 - destPoint.x,
            y: centre.y * 2 - destPoint.y,
            z: centre.z * 2 - destPoint.z
        }
        //todo 结构有问题
        if (!destPoint.data) return p;

        var destp = $.extend({}, p);
        destp.data = $.extend({}, destPoint.data);
        destp.data.geoAttr = p;
        return destp;
    }

    function centrosymmetric_line(line, centre) {
        return {
            sp: centrosymmetric_point(line.sp, centre),
            ep: centrosymmetric_point(line.ep, centre)
        }
    }

    function centrosymmetric_path(path, centre) {
        var points = [];
        for (var i = 0, point; point = path[i]; i++) {
            points[i] = centrosymmetric_point(point, centre);
        }
        return points;
    }

    function centrosymmetric_paths(paths, centre) {
        var curve = [];
        for (var i = 0, path; path = paths[i]; i++) {
            curve[i] = centrosymmetric_path(path, centre)
        }
        return curve;
    }

    function centrosymmetric_circle(circle, centre) {

        var oc = circle.centre, on = circle.normalVector;
        var ncentre = centrosymmetric_point(oc, centre);
        //根据normVector 计算一个特殊点
        var ndest = centrosymmetric_point({x: oc.x + on[0], y: oc.y + on[1], z: oc.z + on[2]}, centre);
        return {
            points: centrosymmetric_paths(circle.points, centre),
            normalVector: [ndest.x - ncentre.x, ndest.y - ncentre.y, ndest.z - ncentre.z],
            radius: circle.radius,
            centre: ncentre
        }
    }

    function centrosymmetric_arc(arc, centre) {
        var sp = arc.sp,
            ep = arc.ep;
        var mid = point_on_arc(arc, 0.5);
        return arc_of_point_point_point(
            centrosymmetric_point(sp, centre),
            centrosymmetric_point(mid, centre),
            centrosymmetric_point(ep, centre)
        )

    }

    function centrosymmetric_plane(plane, centre) {

        var oc = plane.centre, on = plane.normalVector;
        var ncentre = centrosymmetric_point(oc, centre);
        //根据normVector 计算一个特殊点
        var ndest = centrosymmetric_point({x: oc.x + on[0], y: oc.y + on[1], z: oc.z + on[2]}, centre);
        return {
            grid_mesh: {
                vertices: centrosymmetric_path(plane.grid_mesh.vertices, centre),
                vplanes: plane.grid_mesh.vplanes,
                row: plane.grid_mesh.row,
                column: plane.grid_mesh.column
            },
            normalVector: [ndest.x - ncentre.x, ndest.y - ncentre.y, ndest.z - ncentre.z],
            centre: ncentre
        }


    }

    function centrosymmetric_surface(surface, centre) {
        return {
            grid_mesh: {
                vertices: centrosymmetric_path(surface.grid_mesh.vertices, centre),
                vplanes: surface.grid_mesh.vplanes,
                row: surface.grid_mesh.row,
                column: surface.grid_mesh.column

            }
        }
    }

    function centrosymmetric_cylinder(cylinder, centre) {
        return {
            centreTop: centrosymmetric_point(cylinder.centreTop, centre),
            radiusTop: cylinder.radiusTop,
            centreBottom: centrosymmetric_point(cylinder.centreBottom, centre),
            radiusBottom: cylinder.radiusBottom,
            height: cylinder.height,
            grid_mesh: {
                vertices: centrosymmetric_path(cylinder.grid_mesh.vertices, centre),
                vplanes: cylinder.grid_mesh.vplanes,
                row: cylinder.grid_mesh.row,
                column: cylinder.grid_mesh.column
            }
        }
    }

    function centrosymmetric_sphere(surface, centre) {
        var oc = surface.centre, on = surface.normalVector;
        var ncentre = centrosymmetric_point(oc, centre);
        //根据normVector 计算一个特殊点
        var ndest = centrosymmetric_point({x: oc.x + on[0], y: oc.y + on[1], z: oc.z + on[2]}, centre);
        return {
            normalVector: [ndest.x - ncentre.x, ndest.y - ncentre.y, ndest.z - ncentre.z],
            centre: ncentre,
            radius: surface.radius,
            isGap: surface.isGap,
            grid_mesh: {
                vertices: centrosymmetric_path(surface.grid_mesh.vertices, centre),
                vplanes: surface.grid_mesh.vplanes,
                row: surface.grid_mesh.row,
                column: surface.grid_mesh.column

            }
        }
    }

    function centrosymmetric_polyhedron(polyhedron, centre) {
        return {
            grid_mesh: {
                vertices: centrosymmetric_path(polyhedron.grid_mesh.vertices, centre),
                vplanes: polyhedron.grid_mesh.vplanes,
                row: polyhedron.grid_mesh.row,
                column: polyhedron.grid_mesh.column
            },
            edges: polyhedron.edges,
            centre: centrosymmetric_point(polyhedron.centre, centre)

        }
    }


    function axissymmetric_point(point, axis) {
        return centrosymmetric_point(point, projectionByLine_P(axis, point))
    }

    function axissymmetric_line(line, axis) {
        return {
            sp: axissymmetric_point(line.sp, axis),
            ep: axissymmetric_point(line.ep, axis)
        }
    }

    function axissymmetric_path(path, axis) {
        var points = [];
        for (var i = 0, point; point = path[i]; i++) {
            points[i] = axissymmetric_point(point, axis);
        }
        return points;
    }

    function axissymmetric_paths(paths, axis) {
        var curve = [];
        for (var i = 0, path; path = paths[i]; i++) {
            curve[i] = axissymmetric_path(path, axis)
        }
        return curve;
    }

    function axissymmetric_circle(circle, axis) {

        var oc = circle.centre, on = circle.normalVector;
        var ncentre = axissymmetric_point(oc, axis);
        //根据normVector 计算一个特殊点
        var ndest = axissymmetric_point({x: oc.x + on[0], y: oc.y + on[1], z: oc.z + on[2]}, axis);
        return {
            points: axissymmetric_paths(circle.points, axis),
            normalVector: [ndest.x - ncentre.x, ndest.y - ncentre.y, ndest.z - ncentre.z],
            radius: circle.radius,
            centre: ncentre
        }
    }

    function axissymmetric_arc(arc, axis) {
        var sp = arc.sp,
            ep = arc.ep;
        var mid = point_on_arc(arc, 0.5);
        return arc_of_point_point_point(
            axissymmetric_point(sp, axis),
            axissymmetric_point(mid, axis),
            axissymmetric_point(ep, axis)
        )

    }

    function axissymmetric_plane(plane, axis) {

        var oc = plane.centre, on = plane.normalVector;
        var ncentre = axissymmetric_point(oc, axis);
        //根据normVector 计算一个特殊点
        var ndest = axissymmetric_point({x: oc.x + on[0], y: oc.y + on[1], z: oc.z + on[2]}, axis);
        return {
            grid_mesh: {
                vertices: axissymmetric_path(plane.grid_mesh.vertices, axis),
                vplanes: plane.grid_mesh.vplanes,
                row: plane.grid_mesh.row,
                column: plane.grid_mesh.column
            },
            normalVector: [ndest.x - ncentre.x, ndest.y - ncentre.y, ndest.z - ncentre.z],
            centre: ncentre
        }


    }

    function axissymmetric_surface(surface, axis) {
        return {
            grid_mesh: {
                vertices: axissymmetric_path(surface.grid_mesh.vertices, axis),
                vplanes: surface.grid_mesh.vplanes,
                row: surface.grid_mesh.row,
                column: surface.grid_mesh.column
            }
        }
    }

    function axissymmetric_cylinder(cylinder, axis) {
        return {
            centreTop: axissymmetric_point(cylinder.centreTop, axis),
            radiusTop: cylinder.radiusTop,
            centreBottom: axissymmetric_point(cylinder.centreBottom, axis),
            radiusBottom: cylinder.radiusBottom,
            height: cylinder.height,
            grid_mesh: {
                vertices: axissymmetric_path(cylinder.grid_mesh.vertices, axis),
                vplanes: cylinder.grid_mesh.vplanes,
                row: cylinder.grid_mesh.row,
                column: cylinder.grid_mesh.column
            }
        }
    }

    function axissymmetric_sphere(surface, axis) {
        var oc = surface.centre, on = surface.normalVector;
        var ncentre = axissymmetric_point(oc, axis);
        //根据normVector 计算一个特殊点
        var ndest = axissymmetric_point({x: oc.x + on[0], y: oc.y + on[1], z: oc.z + on[2]}, axis);
        return {
            normalVector: [ndest.x - ncentre.x, ndest.y - ncentre.y, ndest.z - ncentre.z],
            centre: ncentre,
            radius: surface.radius,
            isGap: surface.isGap,
            grid_mesh: {
                vertices: axissymmetric_path(surface.grid_mesh.vertices, axis),
                vplanes: surface.grid_mesh.vplanes,
                row: surface.grid_mesh.row,
                column: surface.grid_mesh.column
            }
        }
    }

    function axissymmetric_polyhedron(polyhedron, axis) {
        return {
            grid_mesh: {
                vertices: axissymmetric_path(polyhedron.grid_mesh.vertices, axis),
                vplanes: polyhedron.grid_mesh.vplanes,
                row: polyhedron.grid_mesh.row,
                column: polyhedron.grid_mesh.column
            },
            edges: polyhedron.edges,
            centre: axissymmetric_point(polyhedron.centre, axis)
        }
    }

    function planesymmetric_point(point, splane) {
        return centrosymmetric_point(
            point,
            projectionBySplane_Pv(
                splane,
                sylVector.create(pointToVector(point))
            )
        )
    }

    function planesymmetric_line(line, splane) {
        return {
            sp: planesymmetric_point(line.sp, splane),
            ep: planesymmetric_point(line.ep, splane)
        }
    }

    function planesymmetric_path(path, splane) {
        var points = [];
        for (var i = 0, point; point = path[i]; i++) {
            points[i] = planesymmetric_point(point, splane);
        }
        return points;
    }

    function planesymmetric_paths(paths, splane) {
        var curve = [];
        for (var i = 0, path; path = paths[i]; i++) {
            curve[i] = planesymmetric_path(path, splane)
        }
        return curve;
    }


    function planesymmetric_circle(circle, splane) {

        var oc = circle.centre, on = circle.normalVector;
        var ncentre = planesymmetric_point(oc, splane);
        //根据normVector 计算一个特殊点
        var ndest = planesymmetric_point({x: oc.x + on[0], y: oc.y + on[1], z: oc.z + on[2]}, splane);
        return {
            points: planesymmetric_paths(circle.points, splane),
            normalVector: [ndest.x - ncentre.x, ndest.y - ncentre.y, ndest.z - ncentre.z],
            radius: circle.radius,
            centre: ncentre
        }
    }

    function planesymmetric_arc(arc, splane) {
        var sp = arc.sp,
            ep = arc.ep;
        var mid = point_on_arc(arc, 0.5);
        return arc_of_point_point_point(
            planesymmetric_point(sp, splane),
            planesymmetric_point(mid, splane),
            planesymmetric_point(ep, splane)
        )
    }

    function planesymmetric_plane(plane, splane) {

        var oc = plane.centre, on = plane.normalVector;
        var ncentre = planesymmetric_point(oc, splane);
        //根据normVector 计算一个特殊点
        var ndest = planesymmetric_point({x: oc.x + on[0], y: oc.y + on[1], z: oc.z + on[2]}, splane);
        return {
            grid_mesh: {
                vertices: planesymmetric_path(plane.grid_mesh.vertices, splane),
                vplanes: plane.grid_mesh.vplanes,
                row: plane.grid_mesh.row,
                column: plane.grid_mesh.column
            },
            normalVector: [ndest.x - ncentre.x, ndest.y - ncentre.y, ndest.z - ncentre.z],
            centre: ncentre
        }


    }

    function planesymmetric_surface(surface, splane) {
        return {
            grid_mesh: {
                vertices: planesymmetric_path(surface.grid_mesh.vertices, splane),
                vplanes: surface.grid_mesh.vplanes,
                row: surface.grid_mesh.row,
                column: surface.grid_mesh.column
            }
        }
    }

    function planesymmetric_cylinder(cylinder, splane) {
        return {
            centreTop: planesymmetric_point(cylinder.centreTop, splane),
            radiusTop: cylinder.radiusTop,
            centreBottom: planesymmetric_point(cylinder.centreBottom, splane),
            radiusBottom: cylinder.radiusBottom,
            height: cylinder.height,
            grid_mesh: {
                vertices: planesymmetric_path(cylinder.grid_mesh.vertices, splane),
                vplanes: cylinder.grid_mesh.vplanes,
                row: cylinder.grid_mesh.row,
                column: cylinder.grid_mesh.column
            }
        }
    }

    function planesymmetric_sphere(surface, splane) {
        var oc = surface.centre, on = surface.normalVector;
        var ncentre = planesymmetric_point(oc, splane);
        //根据normVector 计算一个特殊点
        var ndest = planesymmetric_point({x: oc.x + on[0], y: oc.y + on[1], z: oc.z + on[2]}, splane);
        return {
            normalVector: [ndest.x - ncentre.x, ndest.y - ncentre.y, ndest.z - ncentre.z],
            centre: ncentre,
            radius: surface.radius,
            isGap: surface.isGap,
            grid_mesh: {
                vertices: planesymmetric_path(surface.grid_mesh.vertices, splane),
                vplanes: surface.grid_mesh.vplanes,
                row: surface.grid_mesh.row,
                column: surface.grid_mesh.column
            }
        }
    }

    function planesymmetric_polyhedron(polyhedron, splane) {
        return {
            grid_mesh: {
                vertices: planesymmetric_path(polyhedron.grid_mesh.vertices, splane),
                vplanes: polyhedron.grid_mesh.vplanes,
                row: polyhedron.grid_mesh.row,
                column: polyhedron.grid_mesh.column
            },
            edges: polyhedron.edges,
            centre: planesymmetric_point(polyhedron.centre, splane)
        }
    }


    function zoom_point(point, zoom_centre, scale) {
        var p = zoomPoint(point, zoom_centre, scale);
        //todo 结构有问题待重构
        var destp = $.extend({}, p);
        destp.data = $.extend({}, point.data);
        destp.data.geoAttr = p;
        return destp;

    }

    function zoomPoint(point, zoom_centre, scale) {
        return {
            x: point.x * scale - zoom_centre.x * scale + zoom_centre.x,
            y: point.y * scale - zoom_centre.y * scale + zoom_centre.y,
            z: point.z * scale - zoom_centre.z * scale + zoom_centre.z
        }
    }

    function zoomPoints(points, zoom_centre, scale) {
        var scalePoints = [];
        for (var i = 0, point; point = points[i]; i++) {
            scalePoints.push(zoomPoint(point, zoom_centre, scale));
        }
        return scalePoints;
    }

    function zoom_line(line, zoom_centre, scale) {
        return {
            sp: zoom_point(line.sp, zoom_centre, scale),
            ep: zoom_point(line.ep, zoom_centre, scale)
        }
    }

    function zoom_path(path, zoom_centre, scale) {
        var points = [];
        for (var i = 0, point; point = path[i]; i++) {
            points[i] = zoom_point(point, zoom_centre, scale);
        }
        return points;
    }

    function zoom_paths(paths, zoom_centre, scale) {
        var curve = [];
        for (var i = 0, path; path = paths[i]; i++) {
            curve[i] = zoom_path(path, zoom_centre, scale)
        }
        return curve;
    }

    function zoom_circle(circle, zoom_centre, scale) {
        return {
            points: zoom_paths(circle.points, zoom_centre, scale),
            normalVector: circle.normalVector,
            radius: circle.radius * scale,
            centre: zoom_point(circle.centre, zoom_centre, scale)
        }
    }

    function zoom_arc(arc, zoom_centre, scale) {
        return {
            points: zoom_paths(arc.points, zoom_centre, scale),
            normalVector: arc.normalVector,
            radius: arc.radius * scale,
            centre: zoom_point(arc.centre, zoom_centre, scale),
            arcAttr: arc.arcAttr
        }
    }

    function zoom_plane(plane, zoom_centre, scale) {
        return {
            grid_mesh: {
                vertices: zoom_path(plane.grid_mesh.vertices, zoom_centre, scale),
                vplanes: plane.grid_mesh.vplanes,
                row: plane.grid_mesh.row,
                column: plane.grid_mesh.column
            },
            normalVector: plane.normalVector,
            centre: zoom_point(plane.centre, zoom_centre, scale)
        }
    }


    function zoom_surface(surface, zoom_centre, scale) {
        return {
            grid_mesh: {
                vertices: zoom_path(surface.grid_mesh.vertices, zoom_centre, scale),
                vplanes: surface.grid_mesh.vplanes,
                row: surface.grid_mesh.row,
                column: surface.grid_mesh.column
            }
        }
    }

    function zoom_cylinder(cylinder, zoom_centre, scale) {
        return {
            centreTop: zoom_point(cylinder.centreTop, zoom_centre, scale),
            radiusTop: cylinder.radiusTop,
            centreBottom: zoom_point(cylinder.centreBottom, zoom_centre, scale),
            radiusBottom: cylinder.radiusBottom,
            height: cylinder.height,
            grid_mesh: {
                vertices: zoom_path(cylinder.grid_mesh.vertices, zoom_centre, scale),
                vplanes: cylinder.grid_mesh.vplanes,
                row: cylinder.grid_mesh.row,
                column: cylinder.grid_mesh.column
            }
        }
    }

    function zoom_sphere(surface, zoom_centre, scale) {

        return {
            radius: surface.radius,
            normalVector: surface.normalVector,
            centre: zoom_point(surface.centre, zoom_centre, scale),
            isGap: surface.isGap,
            grid_mesh: {
                vertices: zoom_path(surface.grid_mesh.vertices, zoom_centre, scale),
                vplanes: surface.grid_mesh.vplanes,
                row: surface.grid_mesh.row,
                column: surface.grid_mesh.column
            }
        }
    }

    function zoom_polyhedron(polyhedron, zoom_centre, scale) {
        return {
            grid_mesh: {
                vertices: zoom_path(polyhedron.grid_mesh.vertices, zoom_centre, scale),
                vplanes: polyhedron.grid_mesh.vplanes,
                row: polyhedron.grid_mesh.row,
                column: polyhedron.grid_mesh.column
            },
            edges: polyhedron.edges,
            centre: zoom_point(polyhedron.centre, zoom_centre, scale)
        }
    }


    function projection_pointToplane(point, splane, opt_direction) {
        if (!opt_direction) return projectionBySplane_Pv(splane, pointToVector(point));

        var sline = sylLine.create(pointToVector(point), opt_direction);

        if (!splane.intersects(sline)) return {x: NaN, y: NaN, z: NaN};

        return vectorToPoint(splane.intersectionWith(sline).elements);
    }


    function projection_pointToplane_ratio(point, splane, ratio, opt_direction) {
        var projection = projection_pointToplane(point, splane, opt_direction);
        var p = pointOnSP_EP(projection, point, ratio);
        if (!point.data) return p;
        var destp = $.extend({}, p);
        destp.data = $.extend({}, point.data);
        destp.data.geoAttr = p;
        return destp;
    }

    function projection_lineToplane_ratio(line, splane, ratio, opt_direction) {
        return {
            sp: projection_pointToplane_ratio(line.sp, splane, ratio, opt_direction),
            ep: projection_pointToplane_ratio(line.ep, splane, ratio, opt_direction)
        }
    }

    function projection_pathToplane_ratio(path, splane, ratio, opt_direction) {
        var points = [];
        for (var i = 0, point; point = path[i]; i++) {
            points[i] = projection_pointToplane_ratio(point, splane, ratio, opt_direction);
        }
        return points;
    }

    function projection_pathsToplane_ratio(paths, splane, ratio, opt_direction) {
        var curve = [];
        for (var i = 0, path; path = paths[i]; i++) {
            curve[i] = projection_pathToplane_ratio(path, splane, ratio, opt_direction)
        }
        return curve;
    }


    function projection_circleToplane_ratio(circle, splane, ratio, opt_direction) {
        return projection_pathsToplane_ratio(circle.points, splane, ratio, opt_direction)
    }

    function projection_arcToplane_ratio(arc, splane, ratio, opt_direction) {
        return projection_pathsToplane_ratio(arc.points, splane, ratio, opt_direction)
    }

    function projection_planeToplane_ratio(plane, splane, ratio, opt_direction) {

        var oc = plane.centre, on = plane.normalVector;
        var ncentre = projection_pointToplane_ratio(oc, splane, ratio, opt_direction);
        //根据normVector 计算一个特殊点
        var ndest = projection_pointToplane_ratio({
            x: oc.x + on[0],
            y: oc.y + on[1],
            z: oc.z + on[2]
        }, splane, ratio, opt_direction);
        return {
            grid_mesh: {
                vertices: projection_pathToplane_ratio(plane.grid_mesh.vertices, splane, ratio, opt_direction),
                vplanes: plane.grid_mesh.vplanes,
                row: plane.grid_mesh.row,
                column: plane.grid_mesh.column
            },
            normalVector: [ndest.x - ncentre.x, ndest.y - ncentre.y, ndest.z - ncentre.z],
            centre: ncentre
        }

    }

    function projection_surfaceToplane_ratio(surface, splane, ratio, opt_direction) {
        return {
            grid_mesh: {
                vertices: projection_pathToplane_ratio(surface.grid_mesh.vertices, splane, ratio, opt_direction),
                vplanes: surface.grid_mesh.vplanes,
                row: surface.grid_mesh.row,
                column: surface.grid_mesh.column
            }
        }
    }


    function projection_pointToplane_ratio_pointLight(point, splane, ratio, plight) {
        return projection_pointToplane_ratio(point, splane, ratio, [plight.x - point.x, plight.y - point.y, plight.z - point.z]);
    }

    function projection_lineToplane_ratio_pointLight(line, splane, ratio, plight) {
        return {
            sp: projection_pointToplane_ratio_pointLight(line.sp, splane, ratio, plight),
            ep: projection_pointToplane_ratio_pointLight(line.ep, splane, ratio, plight)
        }
    }

    function projection_pathToplane_ratio_pointLight(path, splane, ratio, plight) {
        var points = [];
        for (var i = 0, point; point = path[i]; i++) {
            points[i] = projection_pointToplane_ratio_pointLight(point, splane, ratio, plight);
        }
        return points;
    }

    function projection_pathsToplane_ratio_pointLight(paths, splane, ratio, plight) {
        var curve = [];
        for (var i = 0, path; path = paths[i]; i++) {
            curve[i] = projection_pathToplane_ratio_pointLight(path, splane, ratio, plight)
        }
        return curve;
    }

    function projection_circleToplane_ratio_pointLight(circle, splane, ratio, plight) {
        return projection_pathsToplane_ratio_pointLight(circle.points, splane, ratio, plight)
    }

    function projection_arcToplane_ratio_pointLight(arc, splane, ratio, plight) {
        return projection_pathsToplane_ratio_pointLight(arc.points, splane, ratio, plight)
    }

    function projection_planeToplane_ratio_pointLight(plane, splane, ratio, plight) {
        var oc = plane.centre, on = plane.normalVector;
        var ncentre = projection_pointToplane_ratio_pointLight(oc, splane, ratio, plight);
        //根据normVector 计算一个特殊点
        var ndest = projection_pointToplane_ratio_pointLight({
            x: oc.x + on[0],
            y: oc.y + on[1],
            z: oc.z + on[2]
        }, splane, ratio, plight);
        return {
            grid_mesh: {
                vertices: projection_pathToplane_ratio_pointLight(plane.grid_mesh.vertices, splane, ratio, plight),
                vplanes: plane.grid_mesh.vplanes,
                row: plane.grid_mesh.row,
                column: plane.grid_mesh.column
            },
            normalVector: [ndest.x - ncentre.x, ndest.y - ncentre.y, ndest.z - ncentre.z],
            centre: ncentre
        }

    }

    function projection_surfaceToplane_ratio_pointLight(surface, splane, ratio, plight) {
        return {
            grid_mesh: {
                vertices: projection_pathToplane_ratio_pointLight(surface.grid_mesh.vertices, splane, ratio, plight),
                vplanes: surface.grid_mesh.vplanes,
                row: surface.grid_mesh.row,
                column: surface.grid_mesh.column
            }
        }
    }


    function projection_pointToline_ratio(point, line, ratio) {
        var projection = projectionByLine_P(line, point);
        var p = pointOnSP_EP(projection, point, ratio);
        if (!point.data) return p;
        var destp = $.extend({}, p);
        destp.data = $.extend({}, point.data);
        destp.data.geoAttr = p;
        return destp;


    }

    function projection_lineToline_ratio(line1, line, ratio) {
        return {
            sp: projection_pointToline_ratio(line1.sp, line, ratio),
            ep: projection_pointToline_ratio(line1.ep, line, ratio)
        }
    }

    function projection_pathToline_ratio(path, line, ratio) {
        var points = [];
        for (var i = 0, point; point = path[i]; i++) {
            points[i] = projection_pointToline_ratio(point, line, ratio);
        }
        return points;
    }

    function projection_pathsToline_ratio(paths, line, ratio) {
        var curve = [];
        for (var i = 0, path; path = paths[i]; i++) {
            curve[i] = projection_pathToline_ratio(path, line, ratio)
        }
        return curve;
    }


    function projection_circleToline_ratio(circle, line, ratio) {
        return projection_pathsToline_ratio(circle.points, line, ratio)
    }

    function projection_arcToline_ratio(arc, line, ratio) {
        return projection_pathsToline_ratio(arc.points, line, ratio)
    }

    function projection_planeToline_ratio(plane, line, ratio) {
        var oc = plane.centre, on = plane.normalVector;
        var ncentre = projection_pointToline_ratio(oc, line, ratio);
        //根据normVector 计算一个特殊点
        var ndest = projection_pointToline_ratio({x: oc.x + on[0], y: oc.y + on[1], z: oc.z + on[2]}, line, ratio);
        return {
            grid_mesh: {
                vertices: projection_pathToline_ratio(plane.grid_mesh.vertices, line, ratio),
                vplanes: plane.grid_mesh.vplanes,
                row: plane.grid_mesh.row,
                column: plane.grid_mesh.column
            },
            normalVector: [ndest.x - ncentre.x, ndest.y - ncentre.y, ndest.z - ncentre.z],
            centre: ncentre
        }

    }

    function projection_surfaceToline_ratio(surface, line, ratio) {
        return {
            grid_mesh: {
                vertices: projection_pathToline_ratio(surface.grid_mesh.vertices, line, ratio),
                vplanes: surface.grid_mesh.vplanes,
                row: surface.grid_mesh.row,
                column: surface.grid_mesh.column
            }
        }
    }

    function normalVector_3Points(p1, p2, p3) {
        return crossVector(
            [p2.x - p1.x, p2.y - p1.y, p2.z - p1.z],
            [p3.x - p2.x, p3.y - p2.y, p3.z - p2.z]
        );
    }


    //判断一个多边形是否自身交叉
    /**
     *
     * @param polygon {vertices:[],edges=[]}
     */
    function isPolygon_SelfCross(polygon) {
        var vertices = polygon.vertices, edges = polygon.edges.slice(0), edgeslength = edges.length;

        if (edgeslength == 3) return false;
        //将edge的最后两位移动到前面
        var last1 = edges[edgeslength - 1], last2 = edges[edgeslength - 2];
        edges.unshift(last1);
        edges.unshift(last2);
        for (var i = 0; i < edges.length - 2; i++) {
            var currentEdge = edges[i], nextEdge = edges[i + 2];
            if (intersectionOfSegments(vertices[currentEdge[0]], vertices[currentEdge[1]], vertices[nextEdge[0]], vertices[nextEdge[1]])) return true;
        }
        return false;
    }

    function is_X_Vector(norm) {
        return !isZero(norm[0]) && isZero(norm[1]) && isZero(norm[2])
    }

    function is_Y_Vector(norm) {
        return isZero(norm[0]) && !isZero(norm[1]) && isZero(norm[2])
    }

    function is_Z_Vector(norm) {
        return isZero(norm[0]) && isZero(norm[1]) && !isZero(norm[2])
    }

    function translateAndRotate(sp, ep, geo, length) {

        var x = ep.x - sp.x,
            y = ep.y - sp.y,
            z = ep.z - sp.z;

        if (x == 0 && y == 0) {//如果线平行与Z轴
            if (z < 0) geo.rotateX(PI);//X方向旋转180
        } else {
            if (x == 0) {//X方向上分量为0,平行与yoz
                geo.rotateX(-PI / 2);//X方向旋转-pi/2
                var angle = atan(z / y);
                geo.rotateX(angle);//X方向旋转angle/
                if (y < 0) geo.rotateX(PI);//X方向旋转angle/
            } else {
                var xozLength = sqrt(x * x + z * z);
                var xozAngle = acos(xozLength / length);//计算目标向量于xoz平面的夹角
                if (y > 0) xozAngle = -xozAngle;
                geo.rotateX(xozAngle);
                var angle = acos(z / xozLength);//目标向量在xoz平面内的分量于z轴上的向量的夹角
                if (x < 0) angle = -angle;
                geo.rotateY(angle);
            }
        }
        return geo;
    }

    /**
     * 比较mid 是否在两个start 和end中间
     *  @alias module:geometry2.is_mid_in_s_e
     * @param start
     * @param mid
     * @param end
     * @returns {boolean}
     */
    function is_mid_in_s_e(start, mid, end) {
        return (start < mid && mid < end)
            || (end < mid && mid < start)
    }

    /**
     * 比较value 是否大于PI
     * @alias module:geometry2.isLargerPI
     * @param value
     * @returns {boolean}
     */
    function isLargerPI(value) {
        return value > PI;
    }

    function arcAttr_of_s_m_e_thea(start_thea, mid_thea, end_thea) {


        var flag, direction;
        var minus_of_e_s = end_thea - start_thea;

        if (is_mid_in_s_e(start_thea, mid_thea, end_thea)) {
            (minus_of_e_s > 0) ? direction = 0 : direction = 1;
            isLargerPI(abs(minus_of_e_s)) ? flag = 1 : flag = 0;
        } else {
            (minus_of_e_s > 0) ? direction = 1 : direction = 0;
            isLargerPI(abs(minus_of_e_s)) ? flag = 0 : flag = 1;
        }
        return {
            flag: flag,
            direction: direction
        }

    }

    function arc_of_point_point_point(p1, p2, p3) {

        var centre = externalCenter(p1, p2, p3);
        var vp1 = pointToVector(p1), vp2 = pointToVector(p2), vp3 = pointToVector(p3);
        var v1 = subVector(vp1, vp2), v2 = subVector(vp1, vp3);
        var normalVector = unitVector(crossVector(v1, v2));
        var radius = distance(p1, centre);
        var start_thea = valueOnCircle({centre: centre, normalVector: normalVector, radius: radius}, p1),
            mid_thea = valueOnCircle({centre: centre, normalVector: normalVector, radius: radius}, p2),
            end_thea = valueOnCircle({centre: centre, normalVector: normalVector, radius: radius}, p3);

        var arcAttr = arcAttr_of_s_m_e_thea(start_thea, mid_thea, end_thea);

        return {
            centre: centre,
            radius: radius,
            normalVector: normalVector,
            arcAttr: {
                ang: {
                    s_ang: start_thea,
                    e_ang: end_thea
                },
                flag: arcAttr.flag,
                type: 1,
                direction: arcAttr.direction
            }
        }
    }

    function arc_of_circleangle(start_point, mid_point, end_point) {
        var arc = arc_of_point_point_point(start_point, mid_point, end_point)
        arc.arcAttr.flag = arc.arcAttr.flag.flag ? 0 : 1;
        arc.arcAttr.direction = arc.arcAttr.direction ? 0 : 1;
        return arc
    }

    function arc_of_circle(p1, p2, centre) {
        var vp1 = pointToVector(p1), vp2 = pointToVector(p2), vp3 = pointToVector(centre);
        var v1 = subVector(vp1, vp2), v2 = subVector(vp1, vp3);
        var normalVector = unitVector(crossVector(v1, v2));
        var radius = distance(p1, centre);
        var start_thea = valueOnCircle({centre: centre, normalVector: normalVector, radius: radius}, p1),
            end_thea = valueOnCircle({centre: centre, normalVector: normalVector, radius: radius}, p2);
        var flag;
        var minus_of_e_s = start_thea - end_thea;

        if (minus_of_e_s > 0) {
            isLargerPI(abs(minus_of_e_s)) ? flag = 0 : flag = 1
        } else {
            isLargerPI(abs(minus_of_e_s)) ? flag = 1 : flag = 0
        }
        return {
            centre: centre,
            radius: radius,
            normalVector: normalVector,
            arcAttr: {
                ang: {
                    s_ang: start_thea,
                    e_ang: end_thea
                },
                flag: flag,
                type: 1,
                direction: 0
            }
        }
    }

    /**
     * 将弧上的值（0-1）转换为弧所在圆上的参数方程的参数（0-2*pi）
     * @alias module:geometry2.value_on_Arc_to_Circle
     * @param _arc
     * @param _arcValue
     * @returns {*}
     */
    function value_on_Arc_to_Circle(_arc, _arcValue) {
        var ang = _arc.ang,
            direct = _arc.direction,
            type = _arc.type,
            flag = _arc.flag;

        if (type == 2) return direct ? ang.s_ang - _arcValue * PI_2 : _arcValue * PI_2 + ang.s_ang;
        if (type == 0) return 0;

        if (direct == 1) {//逆时针方向
            if (flag == 0) {
                if (ang.s_ang < ang.e_ang) return ang.s_ang - (ang.s_ang - ang.e_ang + PI_2) * _arcValue;
                return ang.s_ang - _arcValue * (ang.s_ang - ang.e_ang);
            }
            if (ang.s_ang < ang.e_ang) return ang.s_ang - (ang.s_ang - ang.e_ang + PI_2) * _arcValue;
            return ang.s_ang - _arcValue * (ang.s_ang - ang.e_ang);

        } else {
            if (flag == 0) {
                if (ang.s_ang < ang.e_ang) return _arcValue * (ang.e_ang - ang.s_ang) + ang.s_ang;
                return ang.s_ang - (ang.s_ang - ang.e_ang - PI_2) * _arcValue;
            }
            if (ang.s_ang < ang.e_ang) return ang.s_ang - _arcValue * (ang.s_ang - ang.e_ang);
            return ang.s_ang - (ang.s_ang - ang.e_ang - PI_2) * _arcValue;
        }
    }

    function isNear(dest, sp, ep) {
        if (square_distance(dest, sp) > square_distance(dest, ep)) {
            return 1
        }
        return 0
    }

    function value_on_arc(_arc, _point, _initVector) {
        var arcAttr = _arc.arcAttr;
        var type = arcAttr.type,
            sAngle = arcAttr.ang.s_ang,
            eAngle = arcAttr.ang.e_ang,
            direction = arcAttr.direction;
        var sp = _arc.sp, ep = _arc.ep, centre = _arc.centre, sylplane = _arc.sylplane;


        var thea;
        if (type == 2) {
            thea = valueOnCircle(_arc, _point, subVector(pointToVector(centre), pointToVector(sp)));
            return direction ? 1 - thea / PI_2 : thea / PI_2;
        }
        if (type == 0) return 0;

        thea = valueOnCircle(_arc, _point, _initVector);
        if (eAngle > sAngle) {
            if ((thea < eAngle && thea > sAngle) && (direction == 0)) return (thea - sAngle) / (eAngle - sAngle);
            if ((thea > eAngle || thea < sAngle) && (direction == 1)) {
                if (thea > eAngle) return (PI_2 - thea + sAngle) / (PI_2 - (eAngle - sAngle))
                return (sAngle - thea) / (PI_2 - (eAngle - sAngle))
            }
            return isNear(_point, sp, ep)
        }

        if ((thea < eAngle || thea > sAngle) && (direction == 0)) {
            if (thea < eAngle) return (PI_2 - sAngle + thea) / (PI_2 - (sAngle - eAngle))
            return (thea - sAngle) / (PI_2 - (sAngle - eAngle))
        }
        if ((thea > eAngle && thea < sAngle) && (direction == 1))
            return (sAngle - thea) / (sAngle - eAngle)
        return isNear(_point, sp, ep)
    }

    function point_on_arc(arc, _value, vetiVector) {
        if (!arc.arcAttr.type) return {x: NaN, y: NaN, z: NaN};
        _value = value_on_Arc_to_Circle(arc.arcAttr, _value);
        return pointOnCircle(arc, _value, vetiVector)
    }

    /**
     *   根据深度depth返回s,e的二分数组
     */
    function binaryByDepth(s, e, depth) {
        var arr = [s, e];
        while (depth > 0) {
            arr = binary(arr);
            depth--;
        }
        return arr;
    }

    function binary(arr) {
        var newArr = [arr[0]];
        for (var i = 0; i < arr.length - 1; i++) {
            newArr.push(Math.ceil((arr[i] + arr[i + 1]) / 2));
            newArr.push(arr[i + 1]);
        }
        return newArr;
    }


    var NPPlane = function (p0, p1, p2) {
        this._points = [p0,p1, p2];
        this._n_vector = crossVector(
            [p1.x-p0.x,p1.y-p0.y,p1.z-p0.z],
            [p2.x-p0.x,p2.y-p0.y,p2.z-p0.z]
        );
        this._d = -dotVector(this._n_vector,[p0.x,p0.y,p0.z]);
        this._nearPlanes = [];
        this._nearEdges = [];
        this._upperPoints = [];

    }
    NPPlane.prototype = {
        distance: function (point) {
            return this._d + dotVector(this._n_vector, [point.x, point.y, point.z])
        },
        addNearPlane: function (plane) {
            if (this._nearPlanes.indexOf(plane) === -1) {
                if(!Edge.isLegal(this, plane)) return;
                this._nearPlanes.push(plane);
                plane.addNearPlane(this);
                this._nearEdges.push(new Edge(this, plane));
            }
        },
        removeNearPlane:function (plane) {
            var index = this._nearPlanes.indexOf(plane);
            if(index !== -1){
                this._nearPlanes.splice(index, 1);
                this._nearEdges.splice(index, 1);
            }
        },
        traverseNearPlanes: function (callback) {
            for (var i = 0, plane; plane = this._nearPlanes[i]; i++) {
                callback(plane);
            }
        },
        traverseNearEdges:function(callback){
            for (var i = 0, edge; edge = this._nearEdges[i]; i++) {
                callback(edge);
            }
        },
        isUpperPointsEmpty: function () {
            return this._upperPoints.length === 0;
        },
        addUpperPoint: function (point) {
            if(this.distance(point)<=0) return false;
            if (this._upperPoints.indexOf(point) === -1) {
                this._upperPoints.push(point);
            }
            return true;
        },
        getUpperPoints: function () {
            return this._upperPoints.slice(0);
        },
        popFarestPoint: function () {
            var distance = this.distance(this._upperPoints[0]),
                index = 0;
            for (var i = 1; point = this._upperPoints[i]; i++) {
                var dis = this.distance(point);
                if (dis > distance) {
                    index = i;
                    distance = dis;
                }
            }

            return this._upperPoints.splice(index, 1)[0];
        },
        getPoints: function () {
            return this._points.slice(0);
        },
        reverse:function(){
            this._points.reverse();
            this._n_vector = crossVector(
                [this._points[1].x-this._points[0].x,this._points[1].y-this._points[0].y,this._points[1].z-this._points[0].z],
                [this._points[2].x-this._points[0].x,this._points[2].y-this._points[0].y,this._points[2].z-this._points[0].z]
            );
            this._d = -dotVector(this._n_vector,[this._points[0].x,this._points[0].y,this._points[0].z]);

        },
        resetVisited:function(){
            if(this.flag === "visited"){
                this.flag = "not-visited";
                this.traverseNearPlanes(function(plane){
                    plane.resetVisited();
                });

            }
        }
    }

    var Edge = function (plane1, plane2) {
        this._plane1 = plane1;
        this._plane2 = plane2;
    }
    Edge.prototype = {
        isCritical:function (point) {
            if(this._plane1.distance(point)>0) return this._plane2.distance(point)<=0;
            return this._plane2.distance(point)>0;
            //return this._plane1.distance(point)*this._plane2.distance(point)<0 ;
        },
        createPlane:function (farestPoint) {
            var upperPlane = this._plane1,
                lowerPlane = this._plane2;
            if(this._plane2.distance(farestPoint)>0){
                upperPlane = this._plane2;
                lowerPlane = this._plane1;
            }

            var upperPoints = upperPlane.getPoints(),
                lowerPoints = lowerPlane.getPoints();
            for(var i=0,point;point=upperPoints[i];i++){
                if(lowerPoints.indexOf(point) === -1){
                    upperPoints[i] = farestPoint;break;
                }
            }
            var plane = new NPPlane(upperPoints[0], upperPoints[1], upperPoints[2]);

            lowerPlane.removeNearPlane(upperPlane);
            lowerPlane.addNearPlane(plane);

            return plane;

        }
    }
    Edge.isLegal = function (plane1, plane2) {
        var plane1Points = plane1.getPoints(),
            plane2Points = plane2.getPoints();
        var vertexs = [];
        for(var i=0,point;point=plane1Points[i];i++){
            if(plane2Points.indexOf(point) !== -1) vertexs.push(point);
        }

        return vertexs.length==2;
    }


    /**
     *  初始化四面体
     *  @param S 点集
     *  @param NS 面集
     *
     **/
    function init_tetrahedron(S,NS){

        //Todo:如果S共线，则return false

        //找到点集上X分量最小的和最大的点p0,p1，Y分量最小的点p2
        var p0 = S[0],p1=S[0],p2,p3;
        for(var i=1;i<S.length;i++){
            if(S[i].x < p0.x) p0 = S[i];
            if(S[i].x > p1.x) p1 = S[i];
        }
        var S_MinMax = S.slice(0);
        S_MinMax.splice(S_MinMax.indexOf(p0), 1);
        S_MinMax.splice(S_MinMax.indexOf(p1), 1);

        p2=S_MinMax[0];
        for(var i=1;i<S_MinMax.length;i++){
            if(S_MinMax[i].y < p2.y) p2 = S_MinMax[i]
        }
        S_MinMax.splice(S_MinMax.indexOf(p2), 1);


        //如果p0,p1,p2共线，则随机从S中找出3个不共线的点p0,p1,p2;
        if(isTVectorOnLine( [p1.x-p0.x,p1.y-p0.y,p1.z-p0.z], [p2.x-p0.x,p2.y-p0.y,p2.z-p0.z])){
            for(var i=0;i<S_MinMax.length;i++){
                if(!isTVectorOnLine( [p1.x-p0.x,p1.y-p0.y,p1.z-p0.z], [S_MinMax[i].x-p0.x,S_MinMax[i].y-p0.y,S_MinMax[i].z-p0.z])){
                    S_MinMax.push(p2);
                    p2 = S_MinMax[i];
                    S_MinMax.splice(i, 1);
                    break;
                }
            }
        }

        //8. 计算n⃗ =(p1−p0)×(p2−p0),d=−n⃗ ⋅p0;
        var vector_n = crossVector(
            [p1.x-p0.x,p1.y-p0.y,p1.z-p0.z],
            [p2.x-p0.x,p2.y-p0.y,p2.z-p0.z]
        );

        //9. itmin=itmax=it=S.begin();
        var itMin = S_MinMax[0],
            itMax = S_MinMax[0],
            d = -dotVector(vector_n,[p0.x,p0.y,p0.z]);

        //10. distmin=distmax=n⃗ ⋅it+d ;
        var distMin = Math.abs(dotVector(vector_n,[S_MinMax[0].x,S_MinMax[0].y,S_MinMax[0].z])+d),
            distMax = distMin;

        //11. - 22.
        for (var j=1;j<S_MinMax.length;j++){
            var it = S_MinMax[j],
                dist = Math.abs(dotVector(vector_n,[it.x,it.y,it.z])+d);

            if(dist<distMin){
                distMin = dist;
                itMin = it;
                continue;
            }

            if(dist>distMax){
                distMax = dist;
                itMax = it;
            }
        }
        //23.
        p3 = itMax;
        //24. if p0,p1,p2,p3共面, then
        if(isAPlane(p0,p1,p2,p3)){
            //25. 交换点p0与点p2的值
            var tempP = p0;p0 = p2;p2 = tempP;
            p3 = itMin;
            if(isAPlane(p0,p1,p2,p3)) return false;
        }

        var f0 = new NPPlane(p0, p1, p2);
        var f1 = new NPPlane(p0, p3, p1);
        var f2 = new NPPlane(p0, p2, p3);
        var f3 = new NPPlane(p1, p3, p2);
        if(f0.distance(p3) > 0) f0.reverse();
        if(f1.distance(p2) > 0) f1.reverse();
        if(f2.distance(p1) > 0) f2.reverse();
        if(f3.distance(p0) > 0) f3.reverse();
        f0.addNearPlane(f2);
        f0.addNearPlane(f3);
        f0.addNearPlane(f1);
        f1.addNearPlane(f3);
        f1.addNearPlane(f2);
        f2.addNearPlane(f3);

        //39.-40.
        S.splice(S.indexOf(p0),1);
        S.splice(S.indexOf(p1),1);
        S.splice(S.indexOf(p2),1);
        S.splice(S.indexOf(p3),1);

        NS.push(f0);NS.push(f1);NS.push(f2);NS.push(f3);
    }
    //四点是否共面
    var isAPlane = function (p0,p1,p2,p3) {
        var vector_n = crossVector(
            [p1.x-p0.x,p1.y-p0.y,p1.z-p0.z],
            [p2.x-p0.x,p2.y-p0.y,p2.z-p0.z]
            ),
            d = -dotVector(vector_n,[p0.x,p0.y,p0.z]),
            dis =  dotVector(vector_n,[p3.x,p3.y,p3.z])+d;

        return isZero(dis);
    };

    function upperPoints(S,NS) {
        for(var i=0,plane;plane=NS[i];i++){
            for(var j=0;j<S.length;j++){
                if(plane.distance(S[j]) > 0) {
                    plane.addUpperPoint(S[j]);
                    S.splice(j,1);
                    j--;
                }
            }
        }
    }

    function convexHull(points){
        var NS = [];
        init_tetrahedron(points, NS);
        upperPoints(points, NS);
        var Q = [];
        for(var i=0,plane;plane=NS[i];i++){
            if(!plane.isUpperPointsEmpty()) Q.push(plane);
        }

        while(Q.length !== 0){
            var plane = Q[0];
            var farestPoint = plane.popFarestPoint();
            var V = [plane];

            for(var j=0,singlePlane;singlePlane=NS[j];j++){
                singlePlane.flag = 'not-visited';
            }
            plane.flag = 'visited';

            //13-17
            for(var j=0;j<V.length;j++){
                V[j].traverseNearPlanes(function (nearPlane) {
                    if(nearPlane.flag == 'not-visited'){
                        nearPlane.flag = 'visited';
                        if(nearPlane.distance(farestPoint) > 0){
                            V.push(nearPlane);
                        }
                    }
                })
            }
            var L = [];
            //18
            for(var k=0,vPlane;vPlane=V[k];k++){
                L = L.concat(vPlane.getUpperPoints());
            }
            var H = [];
            //19
            for(var k=0,vPlane;vPlane=V[k];k++){
                vPlane.traverseNearEdges(function (edge) {
                    edge.isCritical(farestPoint) && H.push(edge);
                })
            }
            //20-23
            var criticalPlanes = [];
            for(var k=0,edge;edge=H[k];k++){
                var edgePlane = edge.createPlane(farestPoint);
                for(var m=0,criticalPlane;criticalPlane=criticalPlanes[m];m++){
                    edgePlane.addNearPlane(criticalPlane);
                }
                criticalPlanes.push(edgePlane);
                NS.push(edgePlane);
            }

            //31
            for(var x=0,visiblePlane;visiblePlane=V[x];x++){
                if(Q.indexOf(visiblePlane) !== -1){
                    Q.splice(Q.indexOf(visiblePlane),1);
                }
                if(NS.indexOf(visiblePlane) !== -1){
                    NS.splice(NS.indexOf(visiblePlane),1);
                }
            }

            //24-30
            for(var m=0,criticalPlane;criticalPlane=criticalPlanes[m];m++){
                for(var n=0,point;point=L[n];n++){
                    if(criticalPlane.addUpperPoint(point)){
                        L.splice(n,1);n--;
                    }
                }
                //32
                if(!criticalPlane.isUpperPointsEmpty()) Q.push(criticalPlane);

            }

        }

        return NS;

    }

    function areaOf3Points(pa, pb, pc) {
        var ba = distance(pb, pc);
        var bb = distance(pa, pc);
        var bc = distance(pb, pa);
        var p = (ba+bb+bc)/2;
        return sqrt(p*(p-ba)*(p-bb)*(p-bc));
    }

    function insertSegment(point, lines, resortLines){
        var dis = Infinity,
            index = 0,
            sp = true;
        for(var i=0,line;line=lines[i];i++){
            var curDis = square_distance(point, line[0])
            if(curDis < dis) {
                dis = curDis;index = i;
                sp = true
            }
            curDis = square_distance(point, line[1]);
            if(curDis < dis) {
                dis = curDis;index = i;
                sp = false
            }
        }

        var segment = lines.splice(index,1)[0];
        segment = sp?segment:segment.reverse();
        if(curDis > 0.1){
            resortLines.push(segment);
            return segment[1];
        }

        resortLines[resortLines.length-1].push(segment[1]);
        return segment[1];

    }
    function resortLineSegements(_lineSegments){
        if(_lineSegments.length === 0) return _lineSegments;
        var lineSegments = _lineSegments.slice(0);

        var resortLines = [[lineSegments[0][0], lineSegments[0][1]]],
            ep = lineSegments[0][1];
        lineSegments.splice(0,1);
        while(lineSegments.length != 0){
            ep = insertSegment(ep, lineSegments, resortLines);
        }


        return resortLines;

    }


    function intersectionLine_PlaneSurface_4(plane, surface) {
        var vertices = surface.grid_mesh.vertices,
            row = surface.grid_mesh.row,
            column = surface.grid_mesh.column;
        var paths = [];
        for(var i=0;i<row-1;i++){
            for(var j=0;j<column-1;j++){
                var line = intersectionLine_PlanePolygon(plane, [
                    vertices[i*column+j],
                    vertices[i*column+j+1],
                    vertices[(i+1)*column+j+1],
                    vertices[(i+1)*column+j]
                ]);
                if(line) paths.push([line.sp, line.ep]);
            }
        }

        return paths;
    }
    function intersectionLine_PolygonSurface_4(plane, surface) {
        var vertices = surface.grid_mesh.vertices,
            row = surface.grid_mesh.row,
            column = surface.grid_mesh.column;
        var paths = [];
        for(var i=0;i<row-1;i++){
            for(var j=0;j<column-1;j++){
                var line = intersectionLine_2Polygons(plane, [
                    vertices[i*column+j],
                    vertices[i*column+j+1],
                    vertices[(i+1)*column+j+1],
                    vertices[(i+1)*column+j]
                ]);
                if(line) paths.push([line.sp, line.ep]);
            }
        }

        return paths;
    }
    function intersectionLine_2Surfaces_4(surface1, surface2) {
        var vertices = surface1.grid_mesh.vertices,
            row = surface1.grid_mesh.row,
            column = surface1.grid_mesh.column;
        var paths = [];
        for(var i=0;i<row-1;i++){
            for(var j=0;j<column-1;j++){
                var plane = [vertices[i*column+j],
                    vertices[i*column+j+1],
                    vertices[(i+1)*column+j+1],
                    vertices[(i+1)*column+j]]
                paths = paths.concat(intersectionLine_PolygonSurface_4(plane, surface2));
            }
        }

        return resortLineSegements(paths);

    }

    function intersectionLine_PlaneSurface_3(plane, surface) {
        var vertices = surface.grid_mesh.vertices,
            vplanes = surface.grid_mesh.vplanes;
        var paths = [];
        for(var i=0,vplane;vplane=vplanes[i];i++){
            var line = intersectionLine_PlanePolygon(plane, [
                vertices[vplane[0]],
                vertices[vplane[1]],
                vertices[vplane[2]]
            ]);
            if(line) paths.push([line.sp, line.ep]);
        }

        return paths;
    }
    function intersectionLine_PolygonSurface_3(plane, surface) {
        var vertices = surface.grid_mesh.vertices,
            vplanes = surface.grid_mesh.vplanes;
        var paths = [];
        for(var i=0,vplane;vplane=vplanes[i];i++){
            var line = intersectionLine_2Polygons(plane, [
                vertices[vplane[0]],
                vertices[vplane[1]],
                vertices[vplane[2]]
            ]);
            if(line) paths.push([line.sp, line.ep]);
        }

        return paths;
    }
    function intersectionLine_2Surfaces_3(surface1, surface2) {
        var vertices = surface1.grid_mesh.vertices,
            vplanes = surface1.grid_mesh.vplanes;
        var paths = [];
        for(var i=0,plane;plane=vplanes[i];i++){
            paths = paths.concat(intersectionLine_PolygonSurface_3([
                vertices[plane[0]],
                vertices[plane[1]],
                vertices[plane[2]]], surface2));
        }

        return resortLineSegements(paths);

    }

    function normalVector_Points(points){
        var normalVector = normalVector_3Points(points[0],points[1],points[2]);
        if(!isZeroVector(normalVector)) return normalVector;

        return normalVector_3Points(points[points.length-3],points[points.length-2],points[points.length-1]);
    }

    function intersectionLine_PlanePolygon(vertices1,vertices2){
        var vertices2 = vertices2.slice(0);
        vertices2.push(vertices2[0]);

        var normalVector = normalVector_Points(vertices1);
        var d = -dotVector(normalVector,[vertices1[0].x,vertices1[0].y,vertices1[0].z]);

        var distances = [];
        for(var i=0,vertices;vertices=vertices2[i];i++){
            var distance = d + dotVector(normalVector, [vertices.x, vertices.y, vertices.z])
            distances.push(isZero(distance)?0:distance);
        }

        var startDistance = distances[0],
            points = [];
        for(var i=1,len=distances.length;i<len;i++){
            if(startDistance ==0 && distances[i]==0)continue;
            if(startDistance*distances[i] <= 0){
                points.push(vertices2[i-1]);
                points.push(vertices2[i]);
            }
            startDistance = distances[i];
        }

        if(points.length ==0) return false;

        var sylPlane1 = sylPlane.create(pointToVector(vertices1[0]), normalVector),
            sylLine1 = sylLine.create(pointToVector(points[0]),
                subVector(pointToVector(points[0]), pointToVector(points[1]))),
            sylLine2 = sylLine.create(pointToVector(points[2]),
                subVector(pointToVector(points[2]), pointToVector(points[3])));

        return {
            sp:vectorToPoint(sylPlane1.intersectionWith(sylLine1).elements),
            ep:vectorToPoint(sylPlane1.intersectionWith(sylLine2).elements)
        }

    }
    function intersectionLine_2Planes(plane1,plane2){
        var sylplane2 = plane2.sylplane,
            sylplane = plane1.sylplane;
        if(!sylplane2 || !sylplane || !sylplane.intersects(sylplane2)) return null;

        var line = sylplane.intersectionWith(sylplane2);

        var sp = line.pointClosestTo(pointToVector(midPointByPoints(plane1.centre, plane2.centre)))

        return {
            sp:vectorToPoint(sp.elements),
            ep:vectorToPoint(addVector(sp.elements, line.direction.elements))
        }

    }

    function getOverLap_2Lines(line1, line2){
        if(pointEqualPoint(line1.sp, line1.ep)) return line2;

        var value1 = valueOnLine(line1, line2.sp),
            value2 = valueOnLine(line1, line2.ep);
        if(value1<0 && value2<0) return false;
        if(value1>1 && value2>1) return false;

        var values = [
            {point:line1.sp,value:0},
            {point:line1.ep,value:1},
            {point:line2.sp,value:value1},
            {point:line2.ep,value:value2}]

        values.sort(function (a, b) {
            return a.value-b.value;
        })

        return {
            sp:values[1].point,
            ep:values[2].point
        }
    }

    function intersectionLine_2Polygons(vertices1,vertices2){
        var line1 = intersectionLine_PlanePolygon(vertices1,vertices2);
        if(!line1) return false;
        var line2 = intersectionLine_PlanePolygon(vertices2,vertices1);
        if(!line2) return false;

        return getOverLap_2Lines(line1, line2);
    }


    return {
        is_X_Vector: is_X_Vector,
        is_Y_Vector: is_Y_Vector,
        is_Z_Vector: is_Z_Vector,

        isPolygon_SelfCross: isPolygon_SelfCross,
        normalVector_3Points: normalVector_3Points,

        projection_pointToplane: projection_pointToplane,


        projection_pointToline_ratio: projection_pointToline_ratio,
        projection_lineToline_ratio: projection_lineToline_ratio,
        projection_pathToline_ratio: projection_pathToline_ratio,
        projection_pathsToline_ratio: projection_pathsToline_ratio,
        projection_circleToline_ratio: projection_circleToline_ratio,
        projection_arcToline_ratio: projection_arcToline_ratio,
        projection_planeToline_ratio: projection_planeToline_ratio,
        projection_surfaceToline_ratio: projection_surfaceToline_ratio,


        projection_pointToplane_ratio_pointLight: projection_pointToplane_ratio_pointLight,
        projection_lineToplane_ratio_pointLight: projection_lineToplane_ratio_pointLight,
        projection_pathToplane_ratio_pointLight: projection_pathToplane_ratio_pointLight,
        projection_pathsToplane_ratio_pointLight: projection_pathsToplane_ratio_pointLight,
        projection_circleToplane_ratio_pointLight: projection_circleToplane_ratio_pointLight,
        projection_arcToplane_ratio_pointLight: projection_arcToplane_ratio_pointLight,
        projection_planeToplane_ratio_pointLight: projection_planeToplane_ratio_pointLight,
        projection_surfaceToplane_ratio_pointLight: projection_surfaceToplane_ratio_pointLight,


        projection_pointToplane_ratio: projection_pointToplane_ratio,
        projection_lineToplane_ratio: projection_lineToplane_ratio,
        projection_pathToplane_ratio: projection_pathToplane_ratio,
        projection_pathsToplane_ratio: projection_pathsToplane_ratio,
        projection_circleToplane_ratio: projection_circleToplane_ratio,
        projection_arcToplane_ratio: projection_arcToplane_ratio,
        projection_planeToplane_ratio: projection_planeToplane_ratio,
        projection_surfaceToplane_ratio: projection_surfaceToplane_ratio,


        zoomPoints: zoomPoints,
        zoomPoint: zoomPoint,
        zoom_point: zoom_point,
        zoom_line: zoom_line,
        zoom_path: zoom_path,
        zoom_paths: zoom_paths,
        zoom_circle: zoom_circle,
        zoom_arc: zoom_arc,
        zoom_plane: zoom_plane,
        rotate_sphere: rotate_sphere,
        zoom_surface: zoom_surface,
        zoom_cylinder: zoom_cylinder,
        zoom_sphere: zoom_sphere,
        zoom_polyhedron: zoom_polyhedron,

        planesymmetric_point: planesymmetric_point,
        planesymmetric_line: planesymmetric_line,
        planesymmetric_path: planesymmetric_path,
        planesymmetric_paths: planesymmetric_paths,
        planesymmetric_circle: planesymmetric_circle,
        planesymmetric_arc: planesymmetric_arc,
        planesymmetric_plane: planesymmetric_plane,
        planesymmetric_surface: planesymmetric_surface,
        planesymmetric_cylinder: planesymmetric_cylinder,
        planesymmetric_sphere: planesymmetric_sphere,
        planesymmetric_polyhedron: planesymmetric_polyhedron,


        axissymmetric_point: axissymmetric_point,
        axissymmetric_line: axissymmetric_line,
        axissymmetric_circle: axissymmetric_circle,
        axissymmetric_arc: axissymmetric_arc,
        axissymmetric_path: axissymmetric_path,
        axissymmetric_paths: axissymmetric_paths,
        axissymmetric_plane: axissymmetric_plane,
        axissymmetric_surface: axissymmetric_surface,
        axissymmetric_cylinder: axissymmetric_cylinder,
        axissymmetric_sphere: axissymmetric_sphere,
        axissymmetric_polyhedron: axissymmetric_polyhedron,


        centrosymmetric_point: centrosymmetric_point,
        centrosymmetric_line: centrosymmetric_line,
        centrosymmetric_path: centrosymmetric_path,
        centrosymmetric_paths: centrosymmetric_paths,
        centrosymmetric_circle: centrosymmetric_circle,
        centrosymmetric_arc: centrosymmetric_arc,
        centrosymmetric_plane: centrosymmetric_plane,
        centrosymmetric_surface: centrosymmetric_surface,
        centrosymmetric_cylinder: centrosymmetric_cylinder,
        centrosymmetric_sphere: centrosymmetric_sphere,
        centrosymmetric_polyhedron: centrosymmetric_polyhedron,


        rotate_point: rotate_point,
        rotate_line: rotate_line,
        rotate_path: rotate_path,
        rotate_paths: rotate_paths,
        rotate_circle: rotate_circle,
        rotate_arc: rotate_arc,
        rotate_plane: rotate_plane,
        rotate_surface: rotate_surface,
        rotate_cylinder: rotate_cylinder,
        rotate_polyhedron: rotate_polyhedron,

        translate_point: translate_point,
        translate_line: translate_line,
        translate_path: translate_path,
        translate_paths: translate_paths,
        translate_circle: translate_circle,
        translate_arc: translate_arc,
        translate_plane: translate_plane,
        translate_surface: translate_surface,
        translate_cylinder: translate_cylinder,
        translate_sphere: translate_sphere,
        translate_polyhedron: translate_polyhedron,


        isParallel: isParallel,
        tangentOnCurve: tangentOnCurve,
        tangent_Point_Circle: tangent_Point_Circle,

        vertiLine_point_line: vertiLine_point_line,
        pointClosest_sLine_sLine: pointClosest_sLine_sLine,

        intersection_of_line_surface: intersection_of_line_surface,
        intersectTriangle_ray_traiangle: intersectTriangle_ray_traiangle,
        intersection_of_paths_surface: intersection_of_paths_surface,
        intersection_of_spep_surface: intersection_of_spep_surface,


        isUglyPoint: isUglyPoint,
        pointEqualPoint: pointEqualPoint,
        isUglyLine: isUglyLine,
        isLineEqualLine: isLineEqualLine,


        justPointInSegement: justPointInSegement,
        justPointInRay: justPointInRay,
        pointsOnRotaSurface: pointsOnRotaSurface,
        angeInverseVectors: angeInverseVectors,
        getArcThea: getArcThea,

        angeVectors: angeVectors,
        unitVector: unitVector,
        subVector: subVector,
        isZeroVector: isZeroVector,
        isZero: isZero,
        vectorToPoint: vectorToPoint,
        addVector: addVector,
        kMultiplyVector: kMultiplyVector,
        splane_planerotateaxis: splane_planerotateaxis,
        pointToVector: pointToVector,
        crossVector: crossVector,
        pointOnLine: pointOnLine,
        pointOnSP_EP: pointOnSP_EP,
        valueOnLine: valueOnLine,
        valueOnSP_EP_Pos:valueOnSP_EP_Pos,
        pointOnCircle: pointOnCircle,
        calculateCircleInitVector: calculateCircleInitVector,
        pointoncircle_centre_radius_vetivector_value: pointoncircle_centre_radius_vetivector_value,
        valueOnCircle: valueOnCircle,
        pointsOnCircle: pointsOnCircle,
        planeVector: planeVector,
        valueOnPlane: valueOnPlane,
        pointOnPlane: pointOnPlane,
        isPointInPolygon: isPointInPolygon,
        value_on_paths: value_on_paths,
        point_on_paths: point_on_paths,
        length_of_paths: length_of_paths,
        value_on_path: value_on_path,
        point_on_path: point_on_path,
        length_of_path: length_of_path,

        pointsOnArc: pointsOnArc,
        arc_of_point_point_point: arc_of_point_point_point,
        arc_of_circleangle: arc_of_circleangle,
        arc_of_circle: arc_of_circle,
        value_on_arc: value_on_arc,
        point_on_arc: point_on_arc,


        projectionBySP_EP_P: projectionBySP_EP_P,
        projectionByPP: projectionByPP,
        projectionBySplane_Pv: projectionBySplane_Pv,
        calculateRotatePoint: calculateRotatePoint,

        isOnLine: isOnLine,
        distance: distance,
        distance_line_line: distance_line_line,
        distance_PointToLine: distance_PointToLine,
        foot_PointToLine: foot_PointToLine,
        midPointByPoints: midPointByPoints,
        externalCenter: externalCenter,
        gravityCenter: gravityCenter,
        internalCenter: internalCenter,

        lineEp_sp_direction_length: lineEp_sp_direction_length,


        intersections_of_circle_plane: intersections_of_circle_plane,
        intersection_of_circle_circle: intersection_of_circle_circle,
        intersection_of_circle_paths: intersection_of_circle_paths,
        intersections_line_circle: intersections_line_circle,
        intersections_segment_circle: intersections_segment_circle,
        intersectionOfSegments: intersectionOfSegments,
        intersections_Segment_Path: intersections_Segment_Path,
        intersections_Segment_Paths: intersections_Segment_Paths,
        intersections_path_path: intersections_path_path,
        intersections_path_paths: intersections_path_paths,
        intersections_paths_paths: intersections_paths_paths,
        intersection_spep_spep: intersection_spep_spep,
        intersection_line_line: intersection_line_line,
        intersections_line_path: intersections_line_path,
        intersections_line_paths: intersections_line_paths,
        intersection_of_line_plane: intersection_of_line_plane,
        intersectionPointBySLL: intersectionPointBySLL,


        getSphereXYNum: getSphereXYNum,
        getCylinderNum: getCylinderNum,
        sphere_xynum_radius_center_norm_gap: sphere_xynum_radius_center_norm_gap,
        cylinder_taper_num_radius_center_height_norm: cylinder_taper_num_radius_center_height_norm,
        tetrahedron_centre_norm_r: tetrahedron_centre_norm_r,
        hexahedron_centre_norm_r: hexahedron_centre_norm_r,
        octahedron_centre_norm_r: octahedron_centre_norm_r,
        dodecahedron_centre_norm_r_corner: dodecahedron_centre_norm_r_corner,
        positiveIcosahedron_point_norm_r: positiveIcosahedron_point_norm_r,

        translateAndRotate: translateAndRotate,

        binaryByDepth: binaryByDepth,

        convexHull:convexHull,

        areaOf3Points:areaOf3Points,
        isAPlane:isAPlane,
        getOverLap_2Lines:getOverLap_2Lines,
        intersectionLine_2Planes:intersectionLine_2Planes,
        intersectionLine_PlanePolygon:intersectionLine_PlanePolygon,
        intersectionLine_2Polygons:intersectionLine_2Polygons,
        intersectionLine_PlaneSurface_3:intersectionLine_PlaneSurface_3,
        intersectionLine_PlaneSurface_4:intersectionLine_PlaneSurface_4,
        intersectionLine_2Surfaces_3:intersectionLine_2Surfaces_3,
        intersectionLine_2Surfaces_4:intersectionLine_2Surfaces_4


    }


})();