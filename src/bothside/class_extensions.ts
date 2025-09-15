declare global {
  interface Map<K, V> {
    firstValue(): this,
  }
}

Map.prototype.firstValue = function(){
  for(var v of this.values()){ return v; }
};

export {};